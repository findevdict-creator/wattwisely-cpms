/** The gateway answered the upgrade with an HTTP status instead of a socket. */
export class ConnectRefused extends Error {
  constructor(
    readonly status: number,
    readonly reason: string,
  ) {
    super(`Connection refused with ${status}: ${reason}`);
  }
}
