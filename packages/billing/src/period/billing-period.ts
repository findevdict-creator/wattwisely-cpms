/**
 * One calendar month, the unit Wattwisely bills in (module 15). Months are taken in UTC:
 * the fees are per month and the proration per day, so a tenant's time zone does not change
 * what it pays. Keys read "2026-09"; the invoice shows "September 2026".
 */
export class BillingPeriod {
  static readonly KEY_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
  static readonly DAY_MS = 86_400_000;

  private constructor(
    readonly year: number,
    /** 1 to 12. */
    readonly month: number,
  ) {}

  static of(year: number, month: number): BillingPeriod {
    return new BillingPeriod(year, month);
  }

  /** "2026-09" as a period; null for anything else. */
  static parse(key: string): BillingPeriod | null {
    const match = BillingPeriod.KEY_PATTERN.exec(key);
    return match ? new BillingPeriod(Number(match[1]), Number(match[2])) : null;
  }

  static containing(date: Date): BillingPeriod {
    return new BillingPeriod(date.getUTCFullYear(), date.getUTCMonth() + 1);
  }

  /** The month before the one the date is in: what the worker invoices on the 1st. */
  static before(date: Date): BillingPeriod {
    return BillingPeriod.containing(date).previous();
  }

  get key(): string {
    return `${this.year}-${String(this.month).padStart(2, '0')}`;
  }

  /** The first moment of the month. */
  get from(): Date {
    return new Date(Date.UTC(this.year, this.month - 1, 1));
  }

  /** The first moment of the next month: the end, exclusive. */
  get to(): Date {
    return new Date(Date.UTC(this.year, this.month, 1));
  }

  get firstDay(): string {
    return this.from.toISOString().slice(0, 10);
  }

  /** The last day of the month, as a date: what the invoice row stores as period_end. */
  get lastDay(): string {
    return new Date(this.to.getTime() - BillingPeriod.DAY_MS).toISOString().slice(0, 10);
  }

  get days(): number {
    return Math.round((this.to.getTime() - this.from.getTime()) / BillingPeriod.DAY_MS);
  }

  /** "September 2026". */
  get label(): string {
    return this.from.toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  /** "September". */
  get monthName(): string {
    return this.from.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });
  }

  /** True once the month is over: only then can it be invoiced. */
  hasEnded(now: Date): boolean {
    return this.to.getTime() <= now.getTime();
  }

  previous(): BillingPeriod {
    return this.month === 1
      ? new BillingPeriod(this.year - 1, 12)
      : new BillingPeriod(this.year, this.month - 1);
  }

  equals(other: BillingPeriod): boolean {
    return this.year === other.year && this.month === other.month;
  }
}
