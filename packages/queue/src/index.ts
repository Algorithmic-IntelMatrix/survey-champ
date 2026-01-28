import { Queue, Worker, type WorkerOptions } from "bullmq";
import { createClient } from "@surveychamp/redis";

export const SURVEY_SUBMISSION_QUEUE = "survey-submissions";

// Create a dedicated connection for the Queue (Producer)
// It is best practice to have separate connections for blocking vs non-blocking
export const surveySubmissionQueue = new Queue(SURVEY_SUBMISSION_QUEUE, {
  connection: createClient(),
});

// For the Worker, we explicitly create a fresh connection
export const createSurveySubmissionWorker = (
  processor: (job: any) => Promise<any>,
  options?: WorkerOptions
) => {
  return new Worker(SURVEY_SUBMISSION_QUEUE, processor, {
    connection: createClient(),
    ...options,
  });
};
