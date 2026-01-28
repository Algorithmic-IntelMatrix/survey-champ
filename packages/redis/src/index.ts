import Redis from "ioredis";
import { Redis as UpstashRedis } from "@upstash/redis";

// TCP Redis for Worker (supports BRPOP - blocking, zero idle cost)
const REDIS_URL = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL || "redis://localhost:6379";

export const REDIS_OPTIONS = {
  maxRetriesPerRequest: null,
  enableTLSForSentinelMode: false,
  connectTimeout: 10000, // 10 seconds to establish connection
  // Note: NO commandTimeout - BRPOP needs to block indefinitely
  lazyConnect: false, // Connect immediately
  retryStrategy: (times: number) => {
    if (times > 3) {
      console.error('[Redis] Max retries reached, giving up');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 200, 2000);
    console.log(`[Redis] Retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
  tls: REDIS_URL.startsWith('rediss://') ? {
    rejectUnauthorized: false // Accept self-signed certs from Upstash
  } : undefined,
};

export const redis = new Redis(REDIS_URL, REDIS_OPTIONS);

// Connection event listeners for debugging
redis.on('connect', () => console.log('[Redis] Connected to Upstash'));
redis.on('ready', () => console.log('[Redis] Ready to accept commands'));
redis.on('error', (err) => console.error('[Redis] Connection error:', err));
redis.on('close', () => console.log('[Redis] Connection closed'));
redis.on('reconnecting', () => console.log('[Redis] Reconnecting...'));

export const createClient = () => new Redis(REDIS_URL, REDIS_OPTIONS);

// Edge-compatible Redis (HTTP) for Cloudflare Workers
export const upstashRedis = new UpstashRedis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});
