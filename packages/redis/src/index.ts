import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const REDIS_OPTIONS = {
  maxRetriesPerRequest: null,
};

export const redis = new Redis(REDIS_URL, REDIS_OPTIONS);

export const createClient = () => new Redis(REDIS_URL, REDIS_OPTIONS);
