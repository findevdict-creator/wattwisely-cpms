/** A drivers row linked to the logged-in driver's account, with the operator it belongs to (module 19). */
export interface OperatorLinkRecord {
  driverId: string;
  tenantId: string;
  operatorName: string;
  operatorSlug: string;
  /** The name the operator keeps for the driver. */
  driverName: string;
  reference: string;
  status: 'active' | 'blocked';
  paymentMode: 'inherit' | 'pay' | 'free';
  linkedAt: Date | null;
}

/** What the operator holds about the driver, for the consent screen. */
export interface OperatorProfileRecord extends OperatorLinkRecord {
  email: string | null;
  phone: string | null;
  groups: string[];
  cards: { idTag: string; label: string; status: string }[];
}
