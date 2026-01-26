import apiClient from "@/lib/api-client"

interface StartResponseParams {
    surveyId: string;
    mode?: string;
    respondentId?: string;
}

interface UpdateResponseParams {
    id: string;
    response?: any;
    status?: string;
    outcome?: string;
    respondentId?: string;
    redirectUrl?: string;
}

export const surveyResponseApi = {
    startResponse: async (params: StartResponseParams) => {
        const response = await apiClient.post("/survey/response/start", params)
        return response.data.data
    },

    updateResponse: async (params: UpdateResponseParams) => {
        const { id, ...data } = params;
        const response = await apiClient.put(`/survey/response/${id}`, data)
        return response.data
    },

    getMetrics: async (surveyId: string) => {
        const response = await apiClient.get(`/survey/response/metrics/${surveyId}`);
        return response.data.data;
    },

    getResponses: async (surveyId: string) => {
        const response = await apiClient.get(`/survey/response/responses/${surveyId}`);
        return response.data.data;
    },

    getAllUserResponses: async () => {
        const response = await apiClient.get('/survey/response/all');
        return response.data.data;
    }
}
