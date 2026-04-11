import { createClient } from 'redis';
import { config } from './config';

export const redisClient = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
    reconnectStrategy: (retries) => {
      if (retries > 5) {
        console.error('❌ Redis: Máximo de reintentos alcanzado. Deteniendo reconexión.');
        return new Error('Redis connection failed');
      }
      return Math.min(retries * 100, 3000);
    }
  },
  password: config.redis.password,
  database: config.redis.db,
});

redisClient.on('error', (err) => {
  console.error('Error en Redis:', err);
});

export const get = async (key: string) => {
  return await redisClient.get(key);
};

export const set = async (key: string, value: string, ex?: number) => {
  if (ex) {
    return await redisClient.set(key, value, {
      EX: ex
    });
  }
  return await redisClient.set(key, value);
};
