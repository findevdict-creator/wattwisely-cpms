/** When something happened, in the words of a list: "09:06" over "Today", "Yesterday" or "26 Oct". */
export class DayLabel {
  static readonly DAY_MS = 86_400_000;

  /** The time of day, in the browser's time zone. */
  static time(iso: string): string {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  static day(iso: string, now = new Date()): string {
    const date = new Date(iso);
    const days = Math.round((DayLabel.midnight(now) - DayLabel.midnight(date)) / DayLabel.DAY_MS);
    if (days === 0) {
      return 'Today';
    }
    if (days === 1) {
      return 'Yesterday';
    }
    const isThisYear = date.getFullYear() === now.getFullYear();
    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: isThisYear ? undefined : 'numeric',
    });
  }

  /** The day inside a sentence: "saved today", "saved 26 Oct". */
  static inSentence(iso: string, now = new Date()): string {
    const day = DayLabel.day(iso, now);
    return /\d/.test(day) ? day : day.toLowerCase();
  }

  /** "Today, 09:06" or "26 Oct, 18:20". */
  static dayAndTime(iso: string, now = new Date()): string {
    return `${DayLabel.day(iso, now)}, ${DayLabel.time(iso)}`;
  }

  private static midnight(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  }
}
