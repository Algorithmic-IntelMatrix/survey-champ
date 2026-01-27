import { ResponseStatus } from "@surveychamp/db"; // Use enum from db package
import { prisma } from "@surveychamp/db";

// Use a type compatible with transaction clients
// This effectively describes the transaction interface for Prisma
type PrismaTx = any; // Simplifying type for Monorepo usage, or import from Prisma types if needed

interface QuotaRule {
    nodeId: string;
    subField?: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'gt' | 'lt';
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
            
            // Fetch all COMPLETED responses for this survey (excluding current)
            // Fetching just the 'response' JSON for efficiency
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
                if (rData && matchesRule(rData, rule)) {
                    count++;
                }
            }
            
            console.log(`[QuotaCheck] Rule: ${rule.nodeId} subField: ${rule.subField || 'none'} Target: ${rule.value} Limit: ${quota.limit} CurrentCount: ${count}`);
            
            if (count >= quota.limit) {
                return { 
                    isOverQuota: true, 
                    redirectUrl: survey.overQuotaUrl, 
                    type: 'DEMOGRAPHIC' 
                };
            }
        }

        return { isOverQuota: false, redirectUrl: null, type: null };
    }
};

// Helper to check rule against response data
function matchesRule(responseData: Record<string, any>, rule: QuotaRule): boolean {
    const nodeResponse = responseData[rule.nodeId];
    if (!nodeResponse || nodeResponse.answer === undefined) return false;
    
    // Support subField (Matrix rows)
    let answer: any;
    if (rule.subField) {
        // In Matrix choice, nodeResponse.answer is the object { row: col }
        answer = nodeResponse.answer[rule.subField];
    } else {
        answer = nodeResponse.answer;
    }

    if (answer === undefined) return false;
    
    // Normalize operators to support both full names and short names (gt, lt)
    const op = rule.operator;
    const isMatch = (() => {
        switch (op) {
            case 'equals':
                return String(answer) == String(rule.value);
            case 'not_equals':
                return String(answer) != String(rule.value);
            case 'contains':
                return String(answer).includes(String(rule.value));
            case 'greater_than':
            case 'gt':
                return Number(answer) > Number(rule.value);
            case 'less_than':
            case 'lt':
                return Number(answer) < Number(rule.value);
            default:
                return false;
        }
    })();

    console.log(`[QuotaCheck] Node: ${rule.nodeId} subField: ${rule.subField || 'none'} Answer: ${JSON.stringify(answer)} RuleValue: ${rule.value} Op: ${op} Match: ${isMatch}`);
    return isMatch;
}
