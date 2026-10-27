import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import {
  accessGroupMembers,
  accessGroupSites,
  chargers,
  drivers,
  sites,
  Transaction,
} from '@wattwisely/db';
import {
  AccountStatusPolicy,
  PAYMENT_GATEWAY,
  PaymentAccountRow,
  PaymentAccountStore,
  PaymentGateway,
  PaymentRuleResolver,
  ResolvedPaymentRule,
  SavedCardLookup,
} from '@wattwisely/payments';
import { DriverAccount } from '../../../common/account/driver-account';
import { PublicCharger } from '../../payments/public/charge-place.lookup';
import { DriverPlaceAccess, PlaceDriver } from './driver-place-access';

/**
 * Reads, inside the charger's tenant, what decides whether the logged-in driver may charge
 * at it and who pays (module 19): the same levels the gateway reads at a card tap, with the
 * driver found by their login instead of a card.
 */
@Injectable()
export class DriverPlaceAccessResolver {
  private readonly accounts = new PaymentAccountStore();
  private readonly rules = new PaymentRuleResolver();
  private readonly cards = new SavedCardLookup();

  constructor(@Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway) {}

  async resolve(
    tx: Transaction,
    account: DriverAccount,
    charger: PublicCharger,
  ): Promise<DriverPlaceAccess> {
    const place = await this.placeOf(tx, account.id, charger.id);
    const payment = await this.accounts.findCurrent(tx);
    const driver = DriverPlaceAccessResolver.driverOf(place);
    return {
      tenantId: charger.tenantId,
      driver,
      visibility: place?.visibility ?? 'public',
      isMemberAtSite: place?.isMemberAtSite ?? false,
      account: payment,
      isPaymentAccepted: this.gateway.isEnabled && DriverPlaceAccessResolver.canTake(payment),
      rule: await this.ruleOf(tx, driver, payment),
      card: await this.cards.forAccount(tx, account.id),
    };
  }

  private async ruleOf(
    tx: Transaction,
    driver: PlaceDriver | null,
    account: PaymentAccountRow | null,
  ): Promise<ResolvedPaymentRule> {
    const known = driver ? await this.rules.forDriver(tx, driver.id, account) : null;
    return known ?? PaymentRuleResolver.forGuest(account);
  }

  /** The charger's visibility and, when the operator keeps a record of this login, that record and its site membership. */
  private async placeOf(tx: Transaction, accountId: string, chargerId: string) {
    const rows = await tx
      .select({
        driverId: drivers.id,
        driverName: drivers.name,
        driverStatus: drivers.status,
        isGuest: drivers.isGuest,
        visibility: sql<
          'public' | 'private'
        >`coalesce(${chargers.visibilityOverride}, ${sites.visibility})`,
        isMemberAtSite: sql<boolean>`exists (${DriverPlaceAccessResolver.membership(tx)})`,
      })
      .from(chargers)
      .innerJoin(sites, eq(sites.id, chargers.siteId))
      .leftJoin(drivers, and(eq(drivers.driverAccountId, accountId), isNull(drivers.deletedAt)))
      .where(eq(chargers.id, chargerId));
    return rows[0] ?? null;
  }

  private static membership(tx: Transaction) {
    return tx
      .select({ one: sql`1` })
      .from(accessGroupMembers)
      .innerJoin(accessGroupSites, eq(accessGroupSites.groupId, accessGroupMembers.groupId))
      .where(
        and(
          eq(accessGroupMembers.driverId, drivers.id),
          eq(accessGroupSites.siteId, chargers.siteId),
        ),
      );
  }

  private static driverOf(place: Awaited<ReturnType<DriverPlaceAccessResolver['placeOf']>>) {
    if (!place?.driverId) {
      return null;
    }
    const driver: PlaceDriver = {
      id: place.driverId,
      name: place.driverName ?? '',
      status: place.driverStatus ?? 'active',
      isGuest: place.isGuest ?? false,
    };
    return driver;
  }

  private static canTake(account: PaymentAccountRow | null): boolean {
    return account !== null && AccountStatusPolicy.canTakePayments(account.status);
  }
}
