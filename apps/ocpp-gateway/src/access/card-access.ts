/** What the gateway learns about an idTag when it is a registered RFID card (module 13). */
export interface CardAccess {
  cardId: string;
  driverId: string;
  cardStatus: 'active' | 'blocked' | 'lost';
  expiresAt: Date | null;
  driverStatus: 'active' | 'blocked';
  isDriverDeleted: boolean;
  /** The charger's visibility: its own override, or else its site's. */
  visibility: 'public' | 'private';
  /** True when one of the driver's access groups names the charger's site. */
  isMemberAtSite: boolean;
}
