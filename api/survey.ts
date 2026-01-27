import apiClient from "@/lib/api-client";
import { Survey } from "@/types/survey";

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

  updateSurvey: async (id: string, data: { name?: string; description?: string }): Promise<void> => {
    await apiClient.put(`/surveys/${id}`, data);
  },

  deleteSurvey: async (id: string): Promise<void> => {
    await apiClient.delete(`/surveys/${id}`);
  },
};
