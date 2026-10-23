import { TariffPrices } from './tariff';

export type TariffProposalStatus = 'proposed' | 'approved' | 'rejected' | 'withdrawn';

/** A tariff change a Managed operator proposed, waiting for the Owner or decided. */
export interface TariffProposal {
  id: string;
  /** The tariff to change; null for a new tariff. */
  tariff_id: string | null;
  name: string;
  currency: string;
  status: TariffProposalStatus;
  prices: TariffPrices;
  note: string;
  proposed_by: string;
  proposed_at: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_comment: string;
  /** After approval: the tariff that was created or changed. */
  applied_tariff_id: string | null;
  version: number;
}

/** Body of POST /v1/tariff-proposals: new prices for a tariff, or a new tariff. */
export interface CreateTariffProposalRequest {
  tariff_id?: string;
  name?: string;
  currency?: string;
  prices: TariffPrices;
  note?: string;
}
