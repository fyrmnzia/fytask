import Redis from "ioredis";

const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  throw new Error("REDIS_URL is not defined");
};

export const redis = new Redis(getRedisUrl(), {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

export const redisPub = new Redis(getRedisUrl());
export const redisSub = new Redis(getRedisUrl());

redis.on("connect", () => {
  console.log("Connected to Redis");
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

export const redisHelpers = {
  // Rate limiting helper
  async checkRateLimit(key: string, max: number, window: number): Promise<boolean> {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, window);
    }
    return current <= max;
  },
  // Caching helper
  async getCached<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  },

  async setCached(key: string, data: any, ttl: number = 3600): Promise<void> {
    await redis.setex(key, ttl, JSON.stringify(data));
  },

  async deleteCached(key: string): Promise<void> {
    await redis.del(key);
  },

  async deleteCachedPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },

  // Pub/Sub
  async publish(channel: string, message: any): Promise<void> {
    await redisPub.publish(channel, JSON.stringify(message));
  },

  subscribe(channel: string, callback: (message: any) => void): void {
    redisSub.subscribe(channel, (err) => {
      if (err) {
        console.error(`Failed to subscribe to ${channel}:`, err);
      }
    });

    redisSub.on("message", (ch, msg) => {
      if (ch === channel) {
        try {
          callback(JSON.parse(msg));
        } catch (error) {
          console.error("Error parsing Redis message:", error);
        }
      }
    });
  },

  unsubscribe(channel: string): void {
    redisSub.unsubscribe(channel);
  },
};

export default redis;
