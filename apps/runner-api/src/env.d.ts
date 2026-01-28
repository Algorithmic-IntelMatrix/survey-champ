export interface Env {
  // Upstash Redis
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;

  // URLs
  APP_URL: string;
  SURVEY_URL: string;

  // AWS (for S3 if needed)
  AWS_REGION?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_BUCKET_NAME?: string;

  // Database access (via HTTP to builder-api)
  BUILDER_API_URL: string;
}
