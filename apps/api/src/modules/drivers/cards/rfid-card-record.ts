/** One RFID card as the repository returns it. */
export interface RfidCardRecord {
  id: string;
  driverId: string;
  idTag: string;
  label: string;
  status: 'active' | 'blocked' | 'lost';
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
