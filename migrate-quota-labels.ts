import { prisma } from "@surveychamp/db";

async function main() {
    const surveyId = "cc0f2e8b-8df9-4cc3-9660-8f521e400e2d";
    
    console.log(`Migrating Quota for Survey: ${surveyId}`);
    
    const survey = await prisma.surveys.findUnique({
        where: { id: surveyId },
        include: { surveyQuotas: true }
    });

    if (!survey) {
        console.log("Survey not found");
        return;
    }

    for (const q of survey.surveyQuotas) {
        const rule = q.rule as any;
        if (rule && rule.type === 'group') {
            let modified = false;
            rule.children = rule.children.map((child: any) => {
                if (child.type === 'rule' && child.operator === 'equals') {
                    if (child.field === "node_1769542709146_vzeiekw9r" && child.value === "18-24") {
                        child.value = "opt1";
                        modified = true;
                    }
                    if (child.field === "node_1769542137825_gu8gn1t8o" && child.value === "Male") {
                        child.value = "opt1";
                        modified = true;
                    }
                }
                return child;
            });

            if (modified) {
                console.log(`Updating Quota ${q.id}...`);
                await prisma.surveyQuota.update({
                    where: { id: q.id },
                    data: { rule: rule }
                });
            }
        }
    }
    
    console.log("Migration complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
