import Redis from "ioredis";
import { Redis as UpstashRedis } from "@upstash/redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const REDIS_OPTIONS = {
  maxRetriesPerRequest: null,
};

export const redis = new Redis(REDIS_URL, REDIS_OPTIONS);

export const createClient = () => new Redis(REDIS_URL, REDIS_OPTIONS);

// Edge-compatible Redis (HTTP)
export const upstashRedis = new UpstashRedis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});
