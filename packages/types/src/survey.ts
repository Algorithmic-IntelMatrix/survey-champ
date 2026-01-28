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

export interface SurveyWorkflow {
    id: string;
    surveyId: string;
    runtimeJson: any;
    designJson: any;
    status?: "DRAFT" | "PUBLISHED";
    createdAt: string;
    updatedAt: string;
}

export interface SurveyQuota {
    id: string;
    surveyId: string;
    rule: any; // Can be LogicGroup or a simple rule object
    limit: number;
    enabled: boolean;
    createdAt: string;
}

export interface StartResponseParams {
    surveyId: string;
    mode?: string;
    respondentId?: string;
}

export interface UpdateResponseParams {
    id: string;
    response?: any;
    status?: string;
    outcome?: string;
    respondentId?: string;
    redirectUrl?: string;
}
