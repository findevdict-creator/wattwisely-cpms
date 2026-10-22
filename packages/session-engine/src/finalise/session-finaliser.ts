import { Transaction } from '@wattwisely/db';
import { PricingUsage } from '@wattwisely/pricing';
import { ChargerEventNotifier } from '../events/charger-event-notifier';
import { SessionEventData } from '../events/session-event-data';
import { PricedSession, SessionPricer } from '../pricing/session-pricer';
import { SessionState } from '../state/session-state';
import { SessionLineStore } from '../store/session-line-store';
import { SessionRow } from '../store/session-row';
import { SessionStore } from '../store/session-store';
import { SessionTransitions } from '../store/session-transitions';
import { FinalisePolicy } from './finalise-policy';

/**
 * Gives a stopped session its final price (Sessions and Pricing design, step "priced"):
 * writes the receipt lines and totals and moves it to completed, or to failed when
 * there is no valid stop data. Running it twice on one session does nothing the second
 * time, because a completed session can no longer be priced.
 */
export class SessionFinaliser {
  static readonly NO_TARIFF = 'no_tariff';
  static readonly UNPRICED = {
    netAmount: null,
    taxAmount: null,
    grossAmount: null,
    pricingEngineVersion: null,
    pricingInputHash: null,
  };

  private readonly pricer = new SessionPricer();
  private readonly sessions = new SessionStore();
  private readonly lines = new SessionLineStore();
  private readonly transitions = new SessionTransitions();
  private readonly notifier = new ChargerEventNotifier();

  /** The state the session ended in, or null when it was not in a state that can be priced. */
  async finalise(tx: Transaction, session: SessionRow, now: Date): Promise<SessionState | null> {
    if (session.status !== 'stopping') {
      return null;
    }
    const priced = await this.pricer.price(tx, session, {
      now,
      isFinal: true,
      idleUntil: FinalisePolicy.idleUntil(session, now),
    });
    if (priced.kind === 'no_stop_data') {
      return this.fail(tx, session, 'no_valid_stop_data', now);
    }
    const saved = await this.save(tx, session, priced);
    const moved = await this.transitions.apply(tx, session, 'priced', { occurredAt: now });
    if (moved) {
      await this.announce(tx, session, moved.status, saved);
    }
    return moved?.status ?? null;
  }

  /** Ends a session that cannot be priced, recording why. */
  async fail(
    tx: Transaction,
    session: SessionRow,
    reason: 'no_valid_stop_data' | 'stale' | 'closed_by_staff',
    now: Date,
  ): Promise<SessionState | null> {
    const moved = await this.transitions.apply(tx, session, reason, { occurredAt: now });
    if (!moved) {
      return null;
    }
    await this.sessions.saveFailure(tx, session.id, reason);
    await this.announce(tx, session, moved.status, {
      energyWh: session.energyWh,
      grossAmount: null,
    });
    return moved.status;
  }

  /** Writes the receipt and totals; a session without a tariff gets no lines and a flag. */
  private async save(
    tx: Transaction,
    session: SessionRow,
    priced: Exclude<PricedSession, { kind: 'no_stop_data' }>,
  ): Promise<{ energyWh: number; grossAmount: number | null }> {
    if (priced.kind === 'no_tariff') {
      const energyWh = SessionFinaliser.energyOf(priced.usage);
      await this.sessions.savePrice(tx, session.id, {
        ...SessionFinaliser.UNPRICED,
        energyWh,
        endedAt: priced.usage.endedAt,
        reviewFlags: [...priced.usage.flags, SessionFinaliser.NO_TARIFF],
      });
      return { energyWh, grossAmount: null };
    }
    const { result, usage } = priced;
    await this.lines.replace(tx, session, result.lines);
    await this.sessions.savePrice(tx, session.id, {
      netAmount: result.netTotal,
      taxAmount: result.taxTotal,
      grossAmount: result.grossTotal,
      energyWh: result.energyWh,
      endedAt: usage.endedAt,
      pricingEngineVersion: result.engineVersion,
      pricingInputHash: result.inputHash,
      reviewFlags: result.flags,
    });
    return { energyWh: result.energyWh, grossAmount: result.grossTotal };
  }

  private async announce(
    tx: Transaction,
    session: SessionRow,
    status: SessionState,
    change: { energyWh: number; grossAmount: number | null },
  ): Promise<void> {
    await this.notifier.publish(
      tx,
      { id: session.chargerId, tenantId: session.tenantId },
      'session.updated',
      SessionEventData.of(session, { status, ...change }),
    );
  }

  private static energyOf(usage: PricingUsage): number {
    return Math.round(usage.series[usage.series.length - 1]?.wh ?? 0);
  }
}
