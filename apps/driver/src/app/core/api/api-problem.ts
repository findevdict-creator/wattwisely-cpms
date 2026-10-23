import { HttpErrorResponse } from '@angular/common/http';

/**
 * Reads the problem+json body the API sends with every error:
 * a stable `code` to react to and a `detail` sentence to show people.
 */
export class ApiProblem {
  static readonly FALLBACK = 'Something went wrong. Please try again.';

  constructor(
    readonly status: number,
    readonly code: string,
    readonly detail: string,
  ) {}

  static from(error: unknown): ApiProblem {
    if (!(error instanceof HttpErrorResponse)) {
      return new ApiProblem(0, 'unknown', ApiProblem.FALLBACK);
    }
    const body = (error.error ?? {}) as { code?: string; detail?: string };
    return new ApiProblem(error.status, body.code ?? 'unknown', body.detail ?? ApiProblem.FALLBACK);
  }
}
