import { HttpStatus } from '@nestjs/common';

/**
 * The error body every endpoint returns (RFC 9457 "problem details").
 * On the wire the field names follow the API conventions (snake_case), see toJSON().
 */
export class ProblemDetails {
  static readonly CONTENT_TYPE = 'application/problem+json';
  static readonly TYPE_BASE_URL = 'https://docs.wattwisely.com/problems/';

  constructor(
    readonly status: number,
    readonly code: string,
    readonly detail: string,
    readonly requestId: string,
  ) {}

  get type(): string {
    return `${ProblemDetails.TYPE_BASE_URL}${this.code}`;
  }

  /** A readable name for the status, e.g. 404 becomes "Not found". */
  get title(): string {
    const name = (HttpStatus[this.status] as string | undefined) ?? 'ERROR';
    const words = name.replace(/_/g, ' ').toLowerCase();
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  toJSON(): Record<string, string | number> {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      detail: this.detail,
      code: this.code,
      request_id: this.requestId,
    };
  }
}
