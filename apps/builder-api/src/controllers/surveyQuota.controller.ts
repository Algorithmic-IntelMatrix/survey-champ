import type { Request, Response } from "express";
import { prisma } from "@surveychamp/db";

export const surveyQuotaController = {
    getQuotas: async (req: Request, res: Response) => {
        const { surveyId } = req.params as { surveyId: string };
        try {
            const quotas = await prisma.surveyQuota.findMany({
                where: { surveyId },
                orderBy: { createdAt: 'desc' }
            });
            return res.status(200).json({ data: quotas });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    },

    createQuota: async (req: Request, res: Response) => {
        const { surveyId } = req.params as { surveyId: string };
        const { rule, limit, enabled } = req.body;

        try {
            const quota = await prisma.surveyQuota.create({
                data: {
                    surveyId,
                    rule: rule, // expects Json { nodeId, operator, value }
                    limit: Number(limit),
                    enabled: enabled !== undefined ? enabled : true
                }
            });
            return res.status(201).json({ data: quota });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    },

    deleteQuota: async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        try {
            await prisma.surveyQuota.delete({
                where: { id }
            });
            return res.status(200).json({ message: "Quota deleted" });
        } catch (error) {
           console.error(error);
           return res.status(500).json({ error: "Internal Server Error" });
        }
    },
    
    toggleQuota: async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const { enabled } = req.body;
        
        try {
             const quota = await prisma.surveyQuota.update({
                 where: { id },
                 data: { enabled }
             });
             return res.status(200).json({ data: quota });
        } catch (error) {
             return res.status(500).json({ error: "Internal Server Error" });
        }
    }
};
