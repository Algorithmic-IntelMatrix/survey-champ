import { ResponseStatus } from "@surveychamp/db"; // Use enum from db package
import { prisma } from "@surveychamp/db";

// Use a type compatible with transaction clients
// This effectively describes the transaction interface for Prisma
type PrismaTx = any; // Simplifying type for Monorepo usage, or import from Prisma types if needed

interface QuotaRule {
    nodeId: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
}

export const QuotaService = {
    /**
     * Checks if any quotas (global or specific) would be violated if this response completes.
     * MUST be called within a transaction to ensure atomicity.
     * @returns {Promise<{ isOverQuota: boolean; redirectUrl?: string | null; type: 'GLOBAL' | 'DEMOGRAPHIC' | null }>}
     */
    checkQuota: async (
        tx: PrismaTx,
        surveyId: string,
        currentResponseId: string,
        responseData: Record<string, any>,
    ) => {

        const survey = await tx.surveys.findUnique({
            where: { id: surveyId },
            include: { surveyQuotas: true }
        });

        if (!survey) throw new Error("Survey not found");

        // 1. Check Global Quota
        if (survey.globalQuota !== null) {
            const completedCount = await tx.surveyResponse.count({
                where: {
                    surveyId,
                    status: ResponseStatus.COMPLETED,
                    id: { not: currentResponseId } // Exclude current one as it's not completed yet
                }
            });

            if (completedCount >= survey.globalQuota) {
                return { isOverQuota: true, redirectUrl: survey.overQuotaUrl, type: 'GLOBAL' };
            }
        }

        // 2. Check Demographic Quotas
        const quotas = survey.surveyQuotas.filter((q: any) => q.enabled);
        
        for (const quota of quotas) {
            const rule = quota.rule as unknown as QuotaRule;
            
            // Check if CURRENT response matches this rule. 
            // If the user's answer doesn't match the rule, this quota doesn't apply to them.
            if (!matchesRule(responseData, rule)) {
                continue;
            }

            // Count how many ALREADY COMPLETED responses match this rule
            
            let whereClause: any = {
                surveyId,
                status: ResponseStatus.COMPLETED,
                id: { not: currentResponseId }
            };

            // Structure: response: { [nodeId]: { answer: value } }
            // For simple "equals":
            if (rule.operator === 'equals') {
                whereClause.response = {
                    path: [rule.nodeId, 'answer'],
                    equals: rule.value
                };
            } 
            
            if (rule.operator === 'equals') {
                 const count = await tx.surveyResponse.count({ where: whereClause });
                 if (count >= quota.limit) {
                     return { isOverQuota: true, redirectUrl: survey.overQuotaUrl, type: 'DEMOGRAPHIC' };
                 }
            } else {
                // Fallback for complex operators: Fetch minimal data
                const candidates = await tx.surveyResponse.findMany({
                    where: {
                        surveyId,
                        status: ResponseStatus.COMPLETED,
                        id: { not: currentResponseId }
                    },
                    select: { response: true }
                });
                
                let count = 0;
                for (const c of candidates) {
                    const rData = c.response as Record<string, any>;
                    if (matchesRule(rData, rule)) {
                        count++;
                    }
                }
                
                if (count >= quota.limit) {
                    return { isOverQuota: true, redirectUrl: survey.overQuotaUrl, type: 'DEMOGRAPHIC' };
                }
            }
        }

        return { isOverQuota: false, redirectUrl: null, type: null };
    }
};

// Helper to check rule against response data
function matchesRule(responseData: Record<string, any>, rule: QuotaRule): boolean {
    const nodeResponse = responseData[rule.nodeId];
    if (!nodeResponse || nodeResponse.answer === undefined) return false;
    
    const answer = nodeResponse.answer;
    
    switch (rule.operator) {
        case 'equals':
            return answer == rule.value; // Loose equality for nums/strings
        case 'not_equals':
            return answer != rule.value;
        case 'contains':
            return String(answer).includes(String(rule.value));
        case 'greater_than':
            return Number(answer) > Number(rule.value);
        case 'less_than':
            return Number(answer) < Number(rule.value);
        default:
            return false;
    }
}
