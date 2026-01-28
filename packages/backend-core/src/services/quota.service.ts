import { ResponseStatus } from "@surveychamp/db"; // Use enum from db package
import { prisma } from "@surveychamp/db";

// Use a type compatible with transaction clients
// This effectively describes the transaction interface for Prisma
type PrismaTx = any; // Simplifying type for Monorepo usage, or import from Prisma types if needed

interface LogicRule {
    type: 'rule';
    field: string;
    subField?: string;
    operator: string;
    value: any;
}

interface LogicGroup {
    type: 'group';
    logicType: 'AND' | 'OR';
    children: (LogicGroup | LogicRule)[];
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
                    id: { not: currentResponseId }
                }
            });

            if (completedCount >= survey.globalQuota) {
                return { isOverQuota: true, redirectUrl: survey.overQuotaUrl, type: 'GLOBAL' };
            }
        }

        // 2. Check Demographic Quotas
        const quotas = survey.surveyQuotas.filter((q: any) => q.enabled);
        
        for (const quota of quotas) {
            const logic = quota.rule as unknown as (LogicGroup | LogicRule);
            
            // Evaluate logic for CURRENT response
            if (!evaluateItem(responseData, logic)) {
                continue;
            }

            // Fetch all COMPLETED responses for this survey (excluding current)
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
                if (rData && evaluateItem(rData, logic)) {
                    count++;
                }
            }
            
            console.log(`[QuotaCheck] RuleID: ${quota.id} Limit: ${quota.limit} CurrentCount: ${count}`);
            
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

// Recursive logic evaluator
function evaluateItem(responseData: Record<string, any>, item: LogicGroup | LogicRule): boolean {
    if (!item) return false;

    if (item.type === 'group') {
        if (!item.children || item.children.length === 0) return true; // Empty group matches
        
        if (item.logicType === 'AND') {
            return item.children.every(child => evaluateItem(responseData, child));
        } else {
            return item.children.some(child => evaluateItem(responseData, child));
        }
    }

    // Single Rule logic
    const nodeResponse = responseData[item.field];
    if (!nodeResponse || nodeResponse.answer === undefined) return false;
    
    let answer: any;
    if (item.subField) {
        answer = nodeResponse.answer[item.subField];
    } else {
        answer = nodeResponse.answer;
    }

    if (answer === undefined) return false;
    
    switch (item.operator) {
        case 'equals':
            return String(answer) == String(item.value);
        case 'not_equals':
            return String(answer) != String(item.value);
        case 'contains':
            return String(answer).includes(String(item.value));
        case 'greater_than':
        case 'gt':
            return Number(answer) > Number(item.value);
        case 'less_than':
        case 'lt':
            return Number(answer) < Number(item.value);
        case 'is_between':
            if (typeof item.value === 'object' && item.value.min !== undefined && item.value.max !== undefined) {
                const val = Number(answer);
                return val >= Number(item.value.min) && val <= Number(item.value.max);
            }
            return false;
        case 'in_range':
            // Handles comma separated strings or arrays
            const range = Array.isArray(item.value) ? item.value : String(item.value).split(',').map(s => s.trim());
            return range.includes(String(answer));
        default:
            return false;
    }
}
