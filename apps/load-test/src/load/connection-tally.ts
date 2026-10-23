/**
 * How the chargers' connections went: opened, refused by the gateway (by HTTP status),
 * failed on the network, and dropped by the server during the run.
 */
export class ConnectionTally {
  opened = 0;
  dropped = 0;
  readonly refused = new Map<number, number>();
  readonly errors = new Map<string, number>();

  get failed(): number {
    const refused = [...this.refused.values()].reduce((sum, n) => sum + n, 0);
    const errors = [...this.errors.values()].reduce((sum, n) => sum + n, 0);
    return refused + errors;
  }

  refuse(status: number): void {
    this.refused.set(status, (this.refused.get(status) ?? 0) + 1);
  }

  error(message: string): void {
    this.errors.set(message, (this.errors.get(message) ?? 0) + 1);
  }
}
