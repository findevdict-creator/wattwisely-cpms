/** Why an upgrade was refused: the HTTP status to answer, a short reason, and any headers to add. */
export class UpgradeRefusal extends Error {
  constructor(
    readonly status: number,
    readonly reason: string,
    readonly headers: Record<string, string> = {},
  ) {
    super(`${status} ${reason}`);
  }
}
