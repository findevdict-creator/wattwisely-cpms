import { LocalClock } from '@wattwisely/pricing';

/** A person's quiet hours: "22:00" to "07:00" in their time zone. */
export interface QuietHoursSetting {
  start: string;
  end: string;
  timeZone: string;
}

/**
 * When an e-mail to someone with quiet hours may go (NTF-03). Inside the quiet hours it
 * waits until they end; outside, it goes now. Hours that wrap past midnight work too.
 */
export class QuietHours {
  static readonly DAY_SECONDS = 86_400;

  static sendAt(setting: QuietHoursSetting | null, now: Date): Date {
    if (!setting || setting.start === setting.end) {
      return now;
    }
    const second = new LocalClock(setting.timeZone).partsOf(now).secondOfDay;
    const start = QuietHours.parse(setting.start);
    const end = QuietHours.parse(setting.end);
    const isQuiet = start < end ? second >= start && second < end : second >= start || second < end;
    if (!isQuiet) {
      return now;
    }
    const waitSeconds = (end - second + QuietHours.DAY_SECONDS) % QuietHours.DAY_SECONDS;
    return new Date(now.getTime() + waitSeconds * 1000);
  }

  /** "07:30" as seconds after midnight. */
  private static parse(text: string): number {
    const [hours, minutes] = text.split(':').map(Number);
    return hours * 3600 + minutes * 60;
  }
}
