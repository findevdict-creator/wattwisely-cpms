import { SessionPaymentRule } from '@wattwisely/db';

/** inherit asks the next level; pay and free settle it. */
export type PaymentMode = 'inherit' | 'pay' | 'free';

/** A group a driver is in, as far as paying goes. */
export interface GroupPaymentSettings {
  name: string;
  paymentMode: PaymentMode;
  /** The group's own hold in minor units, or null for the tenant's member hold. */
  holdAmount: number | null;
}

/** The levels that decide who pays for a driver's session, most specific first. */
export interface PaymentLevels {
  /** The card's mode when the session starts with a card; null for a start from the app. */
  card: PaymentMode | null;
  driver: PaymentMode;
  groups: GroupPaymentSettings[];
  /** A record the platform made at a public charger (module 19): the guest hold applies. */
  isGuest: boolean;
}

/** The two holds a tenant takes, from its payment account. */
export interface TenantHolds {
  holdAmount: number;
  memberHoldAmount: number;
}

/** The rule for one session, with the hold it needs when it is paid. */
export interface ResolvedPaymentRule extends SessionPaymentRule {
  /** Minor units; null when the session is free or the tenant takes no payments. */
  holdAmount: number | null;
}

/**
 * Who pays for a session (module 19, decided 25 Oct): the card, then the driver, then the
 * driver's groups, then the operator, which always says pay. A card or a driver set to pay
 * wins over a free group; among groups, any free one makes the session free. The hold on a
 * paid session is the lowest a group sets, else the tenant's member hold, or its guest hold
 * for a guest's record. Nothing is free unless an operator said so.
 */
export class PaymentRules {
  static readonly OPERATOR: SessionPaymentRule = {
    outcome: 'pay',
    decided_by: 'operator',
    label: null,
  };
  static readonly GUEST: SessionPaymentRule = { outcome: 'pay', decided_by: 'guest', label: null };
  static readonly STAFF: SessionPaymentRule = { outcome: 'free', decided_by: 'staff', label: null };

  static resolve(levels: PaymentLevels, holds: TenantHolds | null): ResolvedPaymentRule {
    const rule = PaymentRules.decide(levels);
    if (rule.outcome === 'free') {
      return { ...rule, holdAmount: null };
    }
    return { ...rule, holdAmount: holds ? PaymentRules.holdFor(levels, holds) : null };
  }

  static decide(levels: PaymentLevels): SessionPaymentRule {
    if (levels.card && levels.card !== 'inherit') {
      return { outcome: levels.card, decided_by: 'card', label: null };
    }
    if (levels.driver !== 'inherit') {
      return { outcome: levels.driver, decided_by: 'driver', label: null };
    }
    const free = levels.groups.find((group) => group.paymentMode === 'free');
    if (free) {
      return { outcome: 'free', decided_by: 'group', label: free.name };
    }
    const pay = levels.groups.find((group) => group.paymentMode === 'pay');
    return pay ? { outcome: 'pay', decided_by: 'group', label: pay.name } : PaymentRules.OPERATOR;
  }

  /** The lowest hold among the driver's groups that set one, else the tenant's member or guest hold. */
  static holdFor(levels: PaymentLevels, holds: TenantHolds): number {
    const own = levels.groups
      .map((group) => group.holdAmount)
      .filter((amount): amount is number => amount !== null);
    if (own.length > 0) {
      return Math.min(...own);
    }
    return levels.isGuest ? holds.holdAmount : holds.memberHoldAmount;
  }
}
