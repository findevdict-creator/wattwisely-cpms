import { HttpException } from '@nestjs/common';

/**
 * Throw this from any layer to answer with an RFC 9457 problem.
 * `code` is a stable, machine-readable reason the portals can react to,
 * for example `tenant_not_found` or `token_invalid`.
 */
export class ProblemException extends HttpException {
  constructor(
    status: number,
    readonly code: string,
    readonly detail: string,
  ) {
    super(detail, status);
  }
}
