import { Queue, Worker, type QueueOptions, type WorkerOptions } from "bullmq";
import { redis } from "@surveychamp/redis";

export const SURVEY_SUBMISSION_QUEUE = "survey-submissions";

const connection = redis;

export const surveySubmissionQueue = new Queue(SURVEY_SUBMISSION_QUEUE, {
  connection,
});

export const createSurveySubmissionWorker = (
  processor: (job: any) => Promise<any>,
  options?: WorkerOptions
) => {
  return new Worker(SURVEY_SUBMISSION_QUEUE, processor, {
    connection,
    ...options,
  });
};
