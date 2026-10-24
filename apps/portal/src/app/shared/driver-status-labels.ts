/** The words for a driver's and an RFID card's status (module 13). */
export class DriverStatusLabels {
  static readonly DRIVER: Record<string, string> = {
    active: 'Active',
    blocked: 'Blocked',
  };

  static readonly CARD: Record<string, string> = {
    active: 'Active',
    blocked: 'Blocked',
    lost: 'Lost',
  };

  static driver(status: string): string {
    return DriverStatusLabels.DRIVER[status] ?? status;
  }

  static card(status: string): string {
    return DriverStatusLabels.CARD[status] ?? status;
  }
}
