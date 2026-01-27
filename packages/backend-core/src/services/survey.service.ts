import { prisma } from "@surveychamp/db";

export const surveyService = {
    createSurvey : async (id : string, surveyData : {name : string, description : string, client : string}) => {
        const survey = await prisma.surveys.create({
            data : {
                ...surveyData,
                userId: id
            }
        })
        return survey;
    },

    getSurveys : async (userId : string) => {
        const surveys = await prisma.surveys.findMany({
            where : {
                userId
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                surveyWorkflow: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1,
                    select: {
                        status: true
                    }
                }
            }
        });

        // Map to include a cleaner latestWorkflow property
        return surveys.map(s => ({
            ...s,
            latestWorkflow: s.surveyWorkflow[0] || null,
            surveyWorkflow: undefined
        }));
    },

    getSurveyById : async (userId : string | undefined, surveyId : string) => {
        const survey = await prisma.surveys.findFirst({
            where : {
                id: surveyId,
                ...(userId && { userId })
            }
        })
        return survey;
    },

    updateSurvey : async (userId : string, surveyId : string, data: {
        name? : string, 
        description? : string,
        redirectUrl? : string | null,
        overQuotaUrl? : string | null,
        securityTerminateUrl? : string | null,
        globalQuota? : number | null
    }) => {
        const survey = await prisma.surveys.updateMany({
            where : {
                id: surveyId,
                userId
            },
            data
        })
        return survey;
    },

    deleteSurvey : async (userId : string, surveyId : string) => {

        const surveyWorkflow = await prisma.surveyWorkflow.deleteMany({
            where : {
                surveyId,
            }
        })
        const survey = await prisma.surveys.deleteMany({
            where : {
                id: surveyId,
                userId
            }
        })
        return {survey, surveyWorkflow};
    }
}
