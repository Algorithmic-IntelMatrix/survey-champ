import apiClient from "@/lib/api-client";

export interface Survey {
  id: string;
  name: string;
  description: string | null;
  client: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  latestWorkflow?: { status: "DRAFT" | "PUBLISHED" | null };
  globalQuota: number | null;
  overQuotaUrl: string | null;
  redirectUrl: string | null;
  securityTerminateUrl: string | null;
}

export interface SurveyQuota {
    id: string;
    surveyId: string;
    rule: { nodeId: string; operator: string; value: any };
    limit: number;
    enabled: boolean;
    createdAt: string;
}

export const surveyApi = {
  getSurveys: async (): Promise<Survey[]> => {
    const response = await apiClient.get<{ surveys: Survey[] }>("/surveys");
    return response.data.surveys;
  },

  getSurvey: async (id: string): Promise<Survey> => {
    const response = await apiClient.get<{ survey: Survey }>(`/surveys/${id}`);
    return response.data.survey;
  },

  createSurvey: async (data: { name: string; description?: string; client: string }): Promise<Survey> => {
    const response = await apiClient.post<{ survey: Survey }>("/surveys", data);
    return response.data.survey;
  },

  updateSurvey: async (id: string, data: { name?: string; description?: string; redirectUrl?: string | null; overQuotaUrl?: string | null; securityTerminateUrl?: string | null; globalQuota?: number | null }): Promise<void> => {
    await apiClient.put(`/surveys/${id}`, data);
  },

  deleteSurvey: async (id: string): Promise<void> => {
    await apiClient.delete(`/surveys/${id}`);
  },

  // Quota Methods
  getQuotas: async (surveyId: string): Promise<SurveyQuota[]> => {
      const response = await apiClient.get<{ data: SurveyQuota[] }>(`/surveys/${surveyId}/quotas`);
      return response.data.data;
  },

  createQuota: async (surveyId: string, data: { rule: any; limit: number; enabled?: boolean }): Promise<SurveyQuota> => {
      const response = await apiClient.post<{ data: SurveyQuota }>(`/surveys/${surveyId}/quotas`, data);
      return response.data.data;
  },

  deleteQuota: async (id: string): Promise<void> => {
      await apiClient.delete(`/surveys/quotas/${id}`);
  },

  toggleQuota: async (id: string, enabled: boolean): Promise<SurveyQuota> => {
      const response = await apiClient.patch<{ data: SurveyQuota }>(`/surveys/quotas/${id}`, { enabled });
      return response.data.data;
  }
};
