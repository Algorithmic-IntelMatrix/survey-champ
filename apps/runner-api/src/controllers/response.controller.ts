import type { Request, Response } from "express";
import { prisma, ResponseStatus, Mode } from "@surveychamp/db"; // Import from db package
import { QuotaService } from "../services/quota.service";

export const surveyResponseController = {
    getLatestSurveyResponse: async (req: Request, res: Response) => {
        const { surveyId } = req.params as { surveyId: string };
        try {
            const surveyResponse = await prisma.surveyResponse.findFirst({
                where: {
                    surveyId,
                },
                orderBy: {
                    createdAt: 'desc'
                }
            })
            return res.status(200).json({ data: surveyResponse });
        } catch (error) {
            return res.status(500).json({ error: "Internal Server Error" });
        }
    },

    getMetricsBySurveyId: async (req: Request, res: Response) => {
        const { surveyId } = req.params as { surveyId: string };
        try {
            const metrics = await prisma.surveyMetrics.findMany({
                where: {
                    surveyId,
                }
            });
            return res.status(200).json({ data: metrics });
        } catch (error) {
            return res.status(500).json({ error: "Internal Server Error" });
        }
    },

    getResponsesBySurveyId: async (req: Request, res: Response) => {
        const { surveyId } = req.params as { surveyId: string };
        try {
            const responses = await prisma.surveyResponse.findMany({
                where: {
                    surveyId,
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            return res.status(200).json({ data: responses });
        } catch (error) {
            return res.status(500).json({ error: "Internal Server Error" });
        }
    },

    startResponse: async (req: Request, res: Response) => {
        try {
            const { surveyId, mode, respondentId } = req.body;
            if (!surveyId) return res.status(400).json({ error: "surveyId is required" });

            const survey = await prisma.surveys.findUnique({ where: { id: surveyId } });
            if (survey && survey.globalQuota !== null) {
                const completedCount = await prisma.surveyResponse.count({
                     where: {
                         surveyId,
                         status: ResponseStatus.COMPLETED
                     }
                });
                if (completedCount >= survey.globalQuota) {
                    // Quota fully logic handled in updateResponse or here if strictly blocking
                }
            }

            const response = await prisma.surveyResponse.create({
                data: {
                    surveyId,
                    mode: mode || Mode.TEST,
                    status: ResponseStatus.IN_PROGRESS,
                    response: {},
                    respondentId: respondentId || undefined,
                }
            });

            await prisma.surveyMetrics.upsert({
                where: {
                    surveyId_mode: {
                        surveyId,
                        mode: mode || Mode.TEST
                    }
                },
                update: {
                    clicked: { increment: 1 }
                },
                create: {
                    surveyId,
                    mode: mode || Mode.TEST,
                    clicked: 1
                }
            });

            return res.status(201).json({ data: response });
        } catch (error) {
            console.error("Error starting response:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    },

    updateResponse: async (req: Request, res: Response) => {
        try {
            const { id } = req.params as { id: string };
            const { response: responseJson, status, respondentId, outcome, redirectUrl: customRedirectUrl } = req.body;

            if (!id) return res.status(400).json({ error: "Response ID is required" });

            const result = await prisma.$transaction(async (tx) => {
                const currentResponse = await tx.surveyResponse.findUnique({ where: { id }, include: { survey: true } });
                if (!currentResponse) throw new Error("Response not found");

                let finalStatus = status;
                let finalOutcome = outcome;
                let finalRedirectUrl = customRedirectUrl;
                let isOverQuota = false;

                // Check Quota ONLY if we are attempting to COMPLETE the survey
                if (status === ResponseStatus.COMPLETED && currentResponse.status !== ResponseStatus.COMPLETED) {
                    const quotaCheck = await QuotaService.checkQuota(
                        tx, 
                        currentResponse.surveyId, 
                        id, 
                        responseJson || currentResponse.response
                    );

                    if (quotaCheck.isOverQuota) {
                        finalStatus = ResponseStatus.OVER_QUOTA;
                        finalOutcome = quotaCheck.type ? `${quotaCheck.type} Quota Reached` : "Over Quota";
                        finalRedirectUrl = quotaCheck.redirectUrl || currentResponse.survey.overQuotaUrl;
                        isOverQuota = true;
                    }
                }
                
                // Allow security terminate URL override from DB if status is SECURITY_TERMINATE
                if (finalStatus === ResponseStatus.SECURITY_TERMINATE && currentResponse.survey.securityTerminateUrl) {
                     finalRedirectUrl = currentResponse.survey.securityTerminateUrl;
                }

                const updated = await tx.surveyResponse.update({
                    where: { id },
                    data: {
                        response: responseJson !== undefined ? responseJson : undefined,
                        status: finalStatus !== undefined ? finalStatus : undefined,
                        outcome: finalOutcome !== undefined ? finalOutcome : undefined,
                        respondentId: respondentId !== undefined ? respondentId : undefined,
                    },
                    include: { survey: true }
                });

                // Metrics & Webhooks logic
                if (finalStatus && finalStatus !== currentResponse.status && finalStatus !== ResponseStatus.IN_PROGRESS && finalStatus !== ResponseStatus.CLICKED) {
                    const metricKey = finalStatus === ResponseStatus.COMPLETED ? "completed" :
                                      finalStatus === ResponseStatus.DROPPED ? "dropped" :
                                      finalStatus === ResponseStatus.DISQUALIFIED ? "disqualified" :
                                      finalStatus === ResponseStatus.QUALITY_TERMINATE ? "qualityTerminate" :
                                      finalStatus === ResponseStatus.SECURITY_TERMINATE ? "securityTerminate" :
                                      finalStatus === ResponseStatus.OVER_QUOTA ? "overQuota" : null;
                    
                    if (metricKey) {
                        // Dynamically update metrics
                        // Note: TS might complain about dynamic key access on Prisma generated types.
                        // We construct the update object safely.
                        const updateData: any = { [metricKey]: { increment: 1 } };
                        const createData: any = { 
                            surveyId: updated.surveyId, 
                            mode: updated.mode, 
                            [metricKey]: 1 
                        };

                        await tx.surveyMetrics.upsert({
                            where: {
                                surveyId_mode: {
                                    surveyId: updated.surveyId,
                                    mode: updated.mode
                                }
                            },
                            update: updateData,
                            create: createData
                        });
                    }
                }

                return { updated, redirectUrl: finalRedirectUrl };
            });

            const { updated, redirectUrl } = result;

            // Handle Webhook for Dropped / Failed
            if (updated.status === ResponseStatus.DROPPED && updated.survey.webhookUrl) {
                try {
                    const webhookUrl = updated.survey.webhookUrl;
                    if (webhookUrl) {
                        fetch(webhookUrl, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                event: "survey_dropped",
                                surveyId: updated.surveyId,
                                responseId: updated.id,
                                respondentId: updated.respondentId,
                                status: updated.status,
                                timestamp: new Date().toISOString()
                            })
                        }).catch(err => console.error("Webhook failed", err));
                    }
                } catch (err) {
                    console.error("Webhook dispatch error", err);
                }
            }

            let effectiveRedirectUrl = redirectUrl;
            
            if (!effectiveRedirectUrl) {
                if (updated.status === ResponseStatus.DROPPED && updated.survey.redirectUrl) {
                    effectiveRedirectUrl = updated.survey.redirectUrl;
                }
            }

             return res.status(200).json({ 
                 data: updated,
                 redirectUrl: effectiveRedirectUrl
             });

        } catch (error: any) {
            console.error(error);
            if (error.message === "Response not found") return res.status(404).json({ error: "Response not found" });
            return res.status(500).json({ error: "Internal Server Error" });
        }
    },

    getAllResponsesForUser: async (req: Request, res: Response) => {
        try {
            const userId = req.user;
            if (!userId) return res.status(401).json({ error: "Unauthorized" });

            const responses = await prisma.surveyResponse.findMany({
                where: {
                    survey: {
                        userId
                    }
                },
                include: {
                    survey: {
                        select: {
                            name: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            return res.status(200).json({ data: responses });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    },
    
    heartbeat: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            await prisma.surveyResponse.update({
                where: { id },
                data: { updatedAt: new Date() }
            });
            return res.status(200).json({ status: "ok" });
        } catch (error) {
            return res.status(500).json({ error: "Heartbeat failed" });
        }
    }
};
