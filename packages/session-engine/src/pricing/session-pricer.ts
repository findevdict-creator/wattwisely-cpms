import { Transaction } from '@wattwisely/db';
import { PricingEngine, PricingResult, PricingUsage } from '@wattwisely/pricing';
import { SessionHistoryStore } from '../store/session-history-store';
import { SessionMeterStore } from '../store/session-meter-store';
import { SessionRow } from '../store/session-row';
import { SessionStore } from '../store/session-store';
import { TariffVersionStore } from '../store/tariff-version-store';
import { SessionUsageBuilder, UsageWindow } from './session-usage-builder';
import { TariffMapper } from './tariff-mapper';

/** A session's price, or why it has none. */
export type PricedSession =
  | { kind: 'priced'; result: PricingResult; usage: PricingUsage }
  | { kind: 'no_tariff'; usage: PricingUsage }
  | { kind: 'no_stop_data' };

/** Loads what a session's price depends on and runs the pricing engine on it. */
export class SessionPricer {
  private readonly engine = new PricingEngine();
  private readonly usageBuilder = new SessionUsageBuilder();

  constructor(
    private readonly sessions = new SessionStore(),
    private readonly history = new SessionHistoryStore(),
    private readonly meter = new SessionMeterStore(),
    private readonly tariffs = new TariffVersionStore(),
  ) {}

  async price(tx: Transaction, session: SessionRow, window: UsageWindow): Promise<PricedSession> {
    const usage = this.usageBuilder.build(
      {
        session,
        readings: await this.meter.energyReadings(tx, session.id),
        history: await this.history.list(tx, session.id),
        maxPowerKw: await this.sessions.maxPowerKw(tx, session.connectorId),
      },
      window,
    );
    if (!usage) {
      return { kind: 'no_stop_data' };
    }
    const version = session.tariffVersionId
      ? await this.tariffs.find(tx, session.tariffVersionId)
      : null;
    if (!version || !session.currency) {
      return { kind: 'no_tariff', usage };
    }
    const tariff = TariffMapper.toPricing(version, session.currency, session.timeZone);
    return { kind: 'priced', result: this.engine.price(tariff, usage), usage };
  }
}
