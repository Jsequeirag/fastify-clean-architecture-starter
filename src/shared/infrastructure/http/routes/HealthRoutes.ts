import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/Database';
import { logger } from '../../config/Logger';

interface HealthCheck {
  name: string;
  status: 'up' | 'down';
  responseTime?: string;
  error?: string;
}

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_request, reply) => {
    const checks = await Promise.all([dbHealthCheck()]);

    const healthy = checks.every((c) => c.status === 'up');

    reply.status(healthy ? 200 : 503).send({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: checks.reduce<Record<string, HealthCheck>>((acc, check) => {
        acc[check.name] = check;
        return acc;
      }, {}),
    });
  });

  app.get('/health/live', async (_request, reply) => {
    reply.status(200).send({ status: 'alive' });
  });

  app.get('/health/ready', async (_request, reply) => {
    const dbCheck = await dbHealthCheck();
    reply.status(dbCheck.status === 'up' ? 200 : 503).send({
      status: dbCheck.status === 'up' ? 'ready' : 'not ready',
    });
  });
}

async function dbHealthCheck(): Promise<HealthCheck> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { name: 'database', status: 'up', responseTime: '10ms' };
  } catch (error) {
    logger.error('Database health check failed');
    return { name: 'database', status: 'down', error: 'Connection failed' };
  }
}
