/** The engine refuses an input it cannot price honestly, such as bands that leave a gap. */
export class PricingError extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join(' '));
    this.name = 'PricingError';
  }
}
