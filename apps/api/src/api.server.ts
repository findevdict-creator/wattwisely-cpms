import { randomUUID } from 'node:crypto';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ApiConfig } from './config/api.config';
import { HttpMetrics } from './common/metrics/http-metrics';
import { ProblemDetailsFilter } from './common/problem/problem-details.filter';
import { TrustedProxies } from './common/request/trusted-proxies';

/**
 * Starts the HTTP server: Fastify engine, /v1 prefix, CORS for the portals,
 * request validation, RFC 9457 errors, request metrics and, unless switched off with
 * API_DOCS_ENABLED=false, the OpenAPI docs at /docs.
 */
export class ApiServer {
  static readonly ALLOWED_HEADERS = [
    'Authorization',
    'Content-Type',
    'X-Tenant-Id',
    'X-Request-Id',
    'If-Match',
  ];

  /** The raw request body is kept, because a Stripe webhook's signature is over the exact bytes. */
  static readonly OPTIONS = { rawBody: true };

  private readonly logger = new Logger(ApiServer.name);

  async start(): Promise<void> {
    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      ApiServer.createAdapter(),
      ApiServer.OPTIONS,
    );
    ApiServer.configure(app);
    const port = app.get(ApiConfig).port;
    await app.listen(port, '0.0.0.0');
    this.logger.log(`API listening on port ${port}`);
  }

  /**
   * TRUST_PROXY_HOPS (module 12): how many proxies in front of the API to believe about the
   * client's address. 1 behind Caddy, so rate limits and the audit log see the driver's or
   * the user's own address; 0 (the default) when the API is reached directly.
   */
  static createAdapter(): FastifyAdapter {
    return new FastifyAdapter({
      logger: { level: process.env['LOG_LEVEL'] ?? 'info' },
      requestIdHeader: 'x-request-id',
      genReqId: () => randomUUID(),
      trustProxy: TrustedProxies.forHops(Number(process.env['TRUST_PROXY_HOPS'] ?? 0)),
    });
  }

  /** Everything the app needs besides its modules. Tests call this too, so they run the real setup. */
  static configure(app: NestFastifyApplication): void {
    const config = app.get(ApiConfig);
    app.setGlobalPrefix('v1', { exclude: ['health/live', 'health/ready', 'metrics'] });
    app.enableCors({ origin: config.corsOrigins, allowedHeaders: ApiServer.ALLOWED_HEADERS });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new ProblemDetailsFilter());
    app.enableShutdownHooks();
    app.get(HttpMetrics).attach(app.getHttpAdapter().getInstance());
    if (config.isApiDocsEnabled) {
      ApiServer.setUpOpenApi(app);
    }
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
