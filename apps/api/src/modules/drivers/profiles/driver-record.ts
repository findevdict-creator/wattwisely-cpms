/** One driver as the repository returns it, with the counts the list shows. */
export interface DriverRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  reference: string;
  notes: string;
  status: 'active' | 'blocked';
  blockedAt: Date | null;
  blockedByName: string | null;
  blockReason: string;
  /** Soft-deleted: hidden from lists, 404 by id; sessions still name the driver. */
  isDeleted: boolean;
  cardCount: number;
  activeCardCount: number;
  lastSessionAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/** A group a driver is in, by name. */
export interface DriverGroup {
  id: string;
  name: string;
}

/** A driver with the groups they are in. */
export interface DriverSummary extends DriverRecord {
  groups: DriverGroup[];
}
