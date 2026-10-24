/**
 * The one charging profile load management keeps on a charger (module 17). The gateway's
 * adapter turns it into the protocol's shape (OCPP 1.6: a ChargePointMaxProfile on connector
 * 0); here it is just an id and a number of watts. One fixed id per platform, so a new cap
 * replaces the old on the charger and clearing by id removes exactly ours.
 */
export class LoadProfile {
  static readonly PROFILE_ID = 1700;

  static toWatts(kw: number): number {
    return Math.round(kw * 1000);
  }

  static toKw(watts: number): number {
    return Math.round(watts / 100) / 10;
  }
}
