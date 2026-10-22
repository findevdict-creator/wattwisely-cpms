/**
 * A time of day in a band, written "HH:MM" (00:00 to 24:00), kept as seconds since
 * midnight so bands and segments compare as plain numbers.
 */
export class LocalTime {
  static readonly PATTERN = /^([01]\d|2[0-4]):([0-5]\d)$/;
  static readonly DAY_SECONDS = 24 * 60 * 60;

  /** Seconds since midnight, or null when the text is not a valid "HH:MM". */
  static parse(text: string): number | null {
    const match = LocalTime.PATTERN.exec(text);
    if (!match) {
      return null;
    }
    const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60;
    return seconds <= LocalTime.DAY_SECONDS ? seconds : null;
  }

  /** The seconds a valid "HH:MM" means; throws on anything else (validate bands before pricing). */
  static seconds(text: string): number {
    const seconds = LocalTime.parse(text);
    if (seconds === null) {
      throw new Error(`"${text}" is not a time of day (HH:MM).`);
    }
    return seconds;
  }

  static format(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
}
