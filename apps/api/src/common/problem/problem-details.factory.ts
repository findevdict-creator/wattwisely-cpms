import { HttpException, HttpStatus } from '@nestjs/common';
import { ProblemDetails } from './problem-details';
import { ProblemException } from './problem.exception';

/** Turns any thrown error into a ProblemDetails body. Unknown errors become a 500 without internals. */
export class ProblemDetailsFactory {
  create(error: unknown, requestId: string): ProblemDetails {
    if (error instanceof ProblemException) {
      return new ProblemDetails(error.getStatus(), error.code, error.detail, requestId);
    }
    if (error instanceof HttpException) {
      return this.fromHttpException(error, requestId);
    }
    return new ProblemDetails(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'internal_error',
      'Something went wrong on our side.',
      requestId,
    );
  }

  private fromHttpException(error: HttpException, requestId: string): ProblemDetails {
    const status = error.getStatus();
    const code =
      status === HttpStatus.BAD_REQUEST ? 'validation_failed' : this.codeFromStatus(status);
    return new ProblemDetails(status, code, this.messageOf(error), requestId);
  }

  private messageOf(error: HttpException): string {
    const response = error.getResponse();
    if (typeof response === 'object' && response !== null && 'message' in response) {
      const message = (response as { message: string | string[] }).message;
      return Array.isArray(message) ? message.join('; ') : message;
    }
    return error.message;
  }

  private codeFromStatus(status: number): string {
    const name = HttpStatus[status] as string | undefined;
    return name ? name.toLowerCase() : 'http_error';
  }
}
