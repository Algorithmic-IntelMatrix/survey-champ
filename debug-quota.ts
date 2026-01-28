import { prisma } from "@surveychamp/db";
import { QuotaService } from "./packages/backend-core/src/services/quota.service";

async function main() {
    const surveyId = "cc0f2e8b-8df9-4cc3-9660-8f521e400e2d";
    
    console.log(`Checking Survey: ${surveyId}`);
    
    const survey = await prisma.surveys.findUnique({
        where: { id: surveyId },
        include: { surveyQuotas: true }
    });

    if (!survey) {
        console.log("Survey not found");
        return;
    }

    console.log(`Global Quota: ${survey.globalQuota}`);
    console.log(`Quotas found: ${survey.surveyQuotas.length}`);
    
    survey.surveyQuotas.forEach(q => {
        console.log(`- Quota ID: ${q.id}, Limit: ${q.limit}, Enabled: ${q.enabled}`);
        console.log(`  Rule: ${JSON.stringify(q.rule, null, 2)}`);
    });

    const responses = await prisma.surveyResponse.findMany({
        where: {
            surveyId,
            status: "COMPLETED"
        }
    });

    console.log(`Completed Responses: ${responses.length}`);
    
    responses.forEach((r, i) => {
        console.log(`Response ${i + 1}: ${JSON.stringify(r.response, null, 2)}`);
    });

    // Test the checkQuota logic manually
    if (responses.length > 0) {
        const lastResponse = responses[responses.length - 1];
        console.log("\nTesting checkQuota with last response...");
        const result = await QuotaService.checkQuota(
            prisma,
            surveyId,
            "dummy_id",
            lastResponse.response as any
        );
        console.log(`Result: ${JSON.stringify(result, null, 2)}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
