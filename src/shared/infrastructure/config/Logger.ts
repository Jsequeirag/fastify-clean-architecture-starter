import pino from 'pino';
import { config } from './Config';

export const logger = pino({
  level: config.LOG_LEVEL,
  transport:
    config.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  base: {
    pid: process.pid,
    env: config.NODE_ENV,
  },
});
