/** "Good evening, Dana": the home page's first line, by the phone's hour and first name. */
export class Greeting {
  static readonly MORNING_FROM = 5;
  static readonly AFTERNOON_FROM = 12;
  static readonly EVENING_FROM = 18;

  static of(displayName: string, now: Date): string {
    const firstName = displayName.trim().split(/\s+/)[0] ?? '';
    const greeting = `Good ${Greeting.partOfDay(now.getHours())}`;
    return firstName ? `${greeting}, ${firstName}` : greeting;
  }

  private static partOfDay(hour: number): string {
    if (hour >= Greeting.EVENING_FROM || hour < Greeting.MORNING_FROM) {
      return 'evening';
    }
    return hour >= Greeting.AFTERNOON_FROM ? 'afternoon' : 'morning';
  }
}
