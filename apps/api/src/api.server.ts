import { randomUUID } from 'node:crypto';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ApiConfig } from './config/api.config';
import { ProblemDetailsFilter } from './common/problem/problem-details.filter';

/**
 * Starts the HTTP server: Fastify engine, /v1 prefix, CORS for the portals,
 * request validation, RFC 9457 errors and the OpenAPI docs at /docs.
 */
export class ApiServer {
  static readonly ALLOWED_HEADERS = [
    'Authorization',
    'Content-Type',
    'X-Tenant-Id',
    'X-Request-Id',
    'If-Match',
  ];

  private readonly logger = new Logger(ApiServer.name);

  async start(): Promise<void> {
    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      ApiServer.createAdapter(),
    );
    ApiServer.configure(app);
    const port = app.get(ApiConfig).port;
    await app.listen(port, '0.0.0.0');
    this.logger.log(`API listening on port ${port}`);
  }

  static createAdapter(): FastifyAdapter {
    return new FastifyAdapter({
      logger: { level: process.env['LOG_LEVEL'] ?? 'info' },
      requestIdHeader: 'x-request-id',
      genReqId: () => randomUUID(),
    });
  }

  /** Everything the app needs besides its modules. Tests call this too, so they run the real setup. */
  static configure(app: NestFastifyApplication): void {
    const config = app.get(ApiConfig);
    app.setGlobalPrefix('v1', { exclude: ['health/live', 'health/ready'] });
    app.enableCors({ origin: config.corsOrigins, allowedHeaders: ApiServer.ALLOWED_HEADERS });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new ProblemDetailsFilter());
    app.enableShutdownHooks();
    ApiServer.setUpOpenApi(app);
  }

  private static setUpOpenApi(app: NestFastifyApplication): void {
    const document = new DocumentBuilder()
      .setTitle('Wattwisely CPMS API')
      .setVersion('v1')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, document));
  }
}
