import { tariffProposals } from '@wattwisely/db';

/** One tariff_proposals row. */
export type TariffProposalRow = typeof tariffProposals.$inferSelect;

/** A proposal with the names of who proposed and who decided. */
export interface TariffProposalRecord extends TariffProposalRow {
  proposedByLabel: string;
  decidedByLabel: string | null;
}
