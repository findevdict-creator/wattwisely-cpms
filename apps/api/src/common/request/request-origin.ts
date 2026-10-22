/** Where a request came from, for the audit log. */
export class RequestOrigin {
  constructor(
    readonly ip: string,
    readonly requestId: string,
  ) {}
}
