/** One RFID card as the repository returns it. */
export interface RfidCardRecord {
  id: string;
  driverId: string;
  idTag: string;
  label: string;
  status: 'active' | 'blocked' | 'lost';
  /** Whether a session this card starts is paid (module 19): inherit asks the driver. */
  paymentMode: 'inherit' | 'pay' | 'free';
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
