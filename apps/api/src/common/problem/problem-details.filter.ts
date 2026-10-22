import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ProblemDetails } from './problem-details';
import { ProblemDetailsFactory } from './problem-details.factory';

/** Catches every error that leaves a controller and answers with application/problem+json. */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);
  private readonly factory = new ProblemDetailsFactory();

  catch(error: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();
    const problem = this.factory.create(error, String(request.id));

    if (!(error instanceof HttpException)) {
      this.logger.error(`Unhandled error on request ${request.id}`, (error as Error)?.stack);
    }
    reply
      .status(problem.status)
      .header('content-type', ProblemDetails.CONTENT_TYPE)
      .header('x-request-id', String(request.id))
      .send(problem);
  }
}
