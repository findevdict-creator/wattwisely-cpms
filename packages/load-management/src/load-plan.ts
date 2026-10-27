/** How a site's cap is shared among the chargers that are charging. */
export type LoadStrategy = 'equal_share' | 'priority';

/**
 * Why a charger got the cap it did:
 *   share     its part of what was left after every minimum
 *   minimum   the floor a charging charger always gets
 *   idle      the reserve an idle charger keeps so a car can start before the next round
 *   waiting   nothing: the cap is spoken for, a car plugged in here waits for the next round
 *   squeezed  the cap cannot cover every charging charger's minimum, so the minimums are scaled
 */
export type AllocationReason = 'share' | 'minimum' | 'idle' | 'waiting' | 'squeezed';

/** One charger as the allocator sees it. */
export interface LoadChargerInput {
  chargerId: string;
  /** 10 is served first, 1 last; 5 is the default. */
  priority: number;
  /** What the charger can take at most, in watts; null means no known ceiling. */
  maxPowerW: number | null;
  /** True while a car is on one of its connectors. */
  isCharging: boolean;
}

/** The site's policy as the allocator needs it. */
export interface LoadPolicyInput {
  limitW: number;
  minPowerW: number;
  strategy: LoadStrategy;
}

/** The cap for one charger. */
export interface LoadAllocation {
  chargerId: string;
  limitW: number;
  reason: AllocationReason;
}

/** The caps for one site, and whether they add up to the cap or had to be squeezed under it. */
export interface LoadPlan {
  allocations: LoadAllocation[];
  allocatedW: number;
  isOverSubscribed: boolean;
}
