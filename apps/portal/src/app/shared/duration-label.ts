/** How long something took or has been going, in the words of a list: "18 min", "1 h 06". */
export class DurationLabel {
  static readonly MINUTE_MS = 60_000;

  /** From `start` to `end`, or to now while it is still going. */
  static between(start: string, end: string | null, now = new Date()): string {
    const ms = (end ? Date.parse(end) : now.getTime()) - Date.parse(start);
    return DurationLabel.of(ms);
  }

  /** "45 s" under a minute, "18 min" under an hour, then "1 h 06". */
  static of(ms: number): string {
    const minutes = Math.floor(Math.max(ms, 0) / DurationLabel.MINUTE_MS);
    if (minutes === 0) {
      return `${Math.floor(Math.max(ms, 0) / 1000)} s`;
    }
    if (minutes < 60) {
      return `${minutes} min`;
    }
    return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
  }

  /** "now" within a minute, "34 min ago", "3 h ago", then "26 Oct": when a charger was last heard. */
  static ago(iso: string | null, now = new Date()): string {
    if (!iso) {
      return 'never';
    }
    const minutes = Math.floor((now.getTime() - Date.parse(iso)) / DurationLabel.MINUTE_MS);
    if (minutes < 1) {
      return 'now';
    }
    if (minutes < 60) {
      return `${minutes} min ago`;
    }
    if (minutes < 24 * 60) {
      return `${Math.floor(minutes / 60)} h ago`;
    }
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
}
