import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { SessionRow, SessionStates } from '@wattwisely/session-engine';
import { TagPolicy } from '../../commands/tag-policy';
import { ChargerIdentity } from '../../storage/charger-identity';
import { IdleRule } from '../../sessions/idle-rule';
import { SessionRecorder } from '../../sessions/session-recorder';
import { GatewayRepositories } from '../../storage/gateway-repositories';
import { MeterReader } from '../meter-reader';
import { V201MeterReader } from './v201-meter-reader';
import { IdTokenStatus, TransactionEventRequest201 } from './v201-messages';

/**
 * What a Started or Updated event says about a running session: the token that
 * authorised it (when it started without one), and the readings, which are stored
 * and move its energy total as 1.6's MeterValues do. New energy on an idle session
 * means it is charging again; none for two minutes on a charging one means idle.
 */
@Injectable()
export class V201TransactionUpdater {
  constructor(
    private readonly store: GatewayRepositories,
    private readonly recorder: SessionRecorder,
    private readonly tags: TagPolicy,
  ) {}

  /** A token on a session opened without one: who the charge is for, and the verdict to answer. */
  async identify(
    tx: Transaction,
    charger: ChargerIdentity,
    session: SessionRow,
    event: TransactionEventRequest201,
  ): Promise<IdTokenStatus | null> {
    if (!event.idToken || session.idTag !== '') {
      return null;
    }
    const decision = await this.tags.start(tx, charger.id, event.idToken.idToken);
    await this.store.sessions.identify(tx, session.id, {
      idTag: event.idToken.idToken,
      driverId: decision.driverId,
      rfidCardId: decision.cardId,
      commandId: decision.commandId,
      startSource: decision.startSource,
      paymentRule: decision.paymentRule,
      isPaid: decision.paymentRule?.outcome === 'pay',
    });
    return decision.status;
  }

  /** Stores the event's readings against the session and follows the energy. */
  async record(
    tx: Transaction,
    charger: ChargerIdentity,
    session: SessionRow,
    event: TransactionEventRequest201,
  ): Promise<void> {
    const readings = V201MeterReader.read(event.meterValue ?? []);
    if (readings.length === 0 || !SessionStates.isActive(session.status)) {
      return;
    }
    await this.store.meterValues.insertMany(
      tx,
      { id: session.id, tenantId: charger.tenantId, chargerId: charger.id },
      readings,
    );
    const powerW = readings[readings.length - 1]?.powerW ?? null;
    const latest = MeterReader.latestEnergy(readings);
    if (!latest) {
      await this.recorder.announce(tx, session, {
        status: session.status,
        energyWh: session.energyWh,
        extra: { power_w: powerW },
      });
      return;
    }
    const started = await this.withMeterStart(tx, session, readings);
    const energyWh = await this.store.sessions.updateEnergy(tx, started, latest);
    const status = await this.followEnergy(tx, started, { energyWh, at: latest.at });
    await this.recorder.announce(tx, started, { status, energyWh, extra: { power_w: powerW } });
  }

  /** A session that started without a reading takes the first one as its meter start. */
  private async withMeterStart(
    tx: Transaction,
    session: SessionRow,
    readings: ReturnType<typeof V201MeterReader.read>,
  ): Promise<SessionRow> {
    if (session.meterStartWh !== null) {
      return session;
    }
    const earliest = MeterReader.earliestEnergy(readings);
    if (!earliest) {
      return session;
    }
    await this.store.sessions.setMeterStart(tx, session.id, earliest.meterWh);
    return { ...session, meterStartWh: earliest.meterWh };
  }

  /** Idle when the energy stopped going up for two minutes, charging again when it moves. */
  private async followEnergy(
    tx: Transaction,
    session: SessionRow,
    reading: { energyWh: number; at: Date },
  ) {
    const isIncreased = reading.energyWh > session.energyWh;
    const event = isIncreased
      ? 'energy_resumed'
      : IdleRule.isIdleAt(session, reading.at)
        ? 'energy_stopped'
        : null;
    if (!event) {
      return session.status;
    }
    const moved = await this.recorder.move(tx, session, event, { occurredAt: reading.at });
    return moved ?? session.status;
  }
}
