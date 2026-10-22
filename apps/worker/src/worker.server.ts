import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { WorkerConfigLoader } from './config/worker-config.loader';

/**
 * Starts the worker: the background jobs (Sessions and Pricing design, "Worker jobs")
 * and a small HTTP server for the health checks Docker and deploy/scripts/health.sh use.
 */
export class WorkerServer {
  private readonly logger = new Logger(WorkerServer.name);

  async start(): Promise<void> {
    const config = new WorkerConfigLoader().load(process.env);
    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      WorkerServer.createAdapter(),
    );
    app.enableShutdownHooks();
    await app.listen(config.port, '0.0.0.0');
    this.logger.log(`Worker running, health checks on port ${config.port}`);
  }

  static createAdapter(): FastifyAdapter {
    return new FastifyAdapter({ logger: { level: process.env['LOG_LEVEL'] ?? 'info' } });
  }
}
