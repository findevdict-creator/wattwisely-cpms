/** A site an access group opens, or a driver in it, by name. */
export interface NamedRow {
  id: string;
  name: string;
}

/** One access group with the sites it opens and the drivers in it. */
export interface AccessGroupRecord {
  id: string;
  name: string;
  description: string;
  /** Whether the sessions of the group's drivers are paid (module 19); inherit leaves it to the operator. */
  paymentMode: 'inherit' | 'pay' | 'free';
  /** The hold on a member's saved card in minor units; null for the operator's member hold amount. */
  holdAmount: number | null;
  sites: NamedRow[];
  members: NamedRow[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
