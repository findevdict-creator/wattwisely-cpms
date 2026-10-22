/**
 * A 64-bit FNV-1a hash of the pricing input in canonical JSON (keys sorted, dates as
 * ISO strings), so a stored session can show that a re-run saw exactly the same input.
 */
export class InputHash {
  static readonly OFFSET = 0xcbf29ce484222325n;
  static readonly PRIME = 0x100000001b3n;
  static readonly MASK = 0xffffffffffffffffn;

  static of(value: unknown): string {
    const bytes = Buffer.from(JSON.stringify(InputHash.canonical(value)), 'utf8');
    let hash = InputHash.OFFSET;
    for (const byte of bytes) {
      hash = ((hash ^ BigInt(byte)) * InputHash.PRIME) & InputHash.MASK;
    }
    return hash.toString(16).padStart(16, '0');
  }

  static canonical(value: unknown): unknown {
    // Checked by tag, not instanceof, so a Date from another realm (a worker, a clone) counts too.
    if (Object.prototype.toString.call(value) === '[object Date]') {
      return (value as Date).toISOString();
    }
    if (Array.isArray(value)) {
      return value.map((item) => InputHash.canonical(item));
    }
    if (value && typeof value === 'object') {
      return InputHash.canonicalObject(value as Record<string, unknown>);
    }
    return value;
  }

  private static canonicalObject(value: Record<string, unknown>): Record<string, unknown> {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] !== undefined) {
        sorted[key] = InputHash.canonical(value[key]);
      }
    }
    return sorted;
  }
}
