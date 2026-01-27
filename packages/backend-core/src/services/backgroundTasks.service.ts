import { prisma, ResponseStatus } from "@surveychamp/db";

export const BackgroundTasksService = {
    dropStaleResponses: async () => {
        try {
            // Define what "stale" means. E.g., no update for 2 minutes
            const staleThreshold = new Date();
            staleThreshold.setMinutes(staleThreshold.getMinutes() - 2);

            // Find responses that are IN_PROGRESS and haven't been updated recently
            const staleResponses = await prisma.surveyResponse.findMany({
                where: {
                    status: ResponseStatus.IN_PROGRESS,
                    updatedAt: {
                        lt: staleThreshold
                    }
                }
            });

            if (staleResponses.length > 0) {
                console.log(`[BackgroundTasks] Marking ${staleResponses.length} stale responses as DROPPED`);
                
                for (const response of staleResponses) {
                    await prisma.surveyResponse.update({
                        where: { id: response.id },
                        data: { 
                            status: ResponseStatus.DROPPED,
                            outcome: "Heartbeat Timeout (Abandoned)"
                        }
                    });

                    // Update Metrics
                    await prisma.surveyMetrics.upsert({
                        where: {
                            surveyId_mode: {
                                surveyId: response.surveyId,
                                mode: response.mode
                            }
                        },
                        update: {
                            dropped: { increment: 1 }
                        },
                        create: {
                            surveyId: response.surveyId,
                            mode: response.mode,
                            dropped: 1
                        }
                    });
                }
            }
        } catch (error) {
            console.error("[BackgroundTasks] Error dropping stale responses:", error);
        }
    }
};
