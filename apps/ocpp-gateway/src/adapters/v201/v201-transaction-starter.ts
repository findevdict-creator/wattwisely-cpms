import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { SessionRow } from '@wattwisely/session-engine';
import { TagDecision, TagPolicy } from '../../commands/tag-policy';
import { ChargerIdentity } from '../../storage/charger-identity';
import { SessionOpener } from '../../sessions/session-opener';
import { GatewayConnector } from '../../storage/gateway-connectors.repository';
import { GatewayRepositories } from '../../storage/gateway-repositories';
import { SessionIdentity } from '../../storage/sessions.repository';
import { MeterReader } from '../meter-reader';
import { V201MeterReader } from './v201-meter-reader';
import { IdTokenStatus, TransactionEventRequest201 } from './v201-messages';

/** What opening or finding a transaction's session established. */
export interface StartedSession {
  session: SessionRow;
  /** The verdict on the event's token, when it carried one. */
  tokenStatus: IdTokenStatus | null;
}

/**
 * Opens the session for a 2.0.1 transaction: at the Started event, or at the first event
 * the gateway sees of a transaction it never saw start (the gateway may have been away).
 * The charger's transaction id is kept so later events and a remote stop find the
 * session; a resent Started with the same id gets the same session, never a second one.
 * A transaction may start before anyone is authorised (a car plugged in, the card to
 * follow): the token then arrives with a later event and the updater records it.
 */
@Injectable()
export class V201TransactionStarter {
  constructor(
    private readonly store: GatewayRepositories,
    private readonly opener: SessionOpener,
    private readonly tags: TagPolicy,
  ) {}

  async findOrOpen(
    tx: Transaction,
    charger: ChargerIdentity,
    connector: GatewayConnector,
    event: TransactionEventRequest201,
  ): Promise<StartedSession> {
    const ref = event.transactionInfo.transactionId;
    const existing = await this.store.sessions.findByTransactionRef(tx, charger.id, ref);
    const decision = event.idToken
      ? {
          ...(await this.tags.start(tx, charger.id, event.idToken.idToken)),
          idTag: event.idToken.idToken,
        }
      : null;
    if (existing) {
      return { session: existing, tokenStatus: decision?.status ?? null };
    }
    const session = await this.open(tx, charger, { connector, event, decision });
    return { session, tokenStatus: decision?.status ?? null };
  }

  private open(
    tx: Transaction,
    charger: ChargerIdentity,
    opening: {
      connector: GatewayConnector;
      event: TransactionEventRequest201;
      decision: (TagDecision & { commandId: string | null; idTag: string }) | null;
    },
  ): Promise<SessionRow> {
    const { connector, event, decision } = opening;
    const readings = V201MeterReader.read(event.meterValue ?? []);
    return this.opener.open(tx, charger, {
      tenantId: charger.tenantId,
      chargerId: charger.id,
      connectorId: connector.id,
      ...V201TransactionStarter.identityOf(decision),
      startedAt: new Date(event.timestamp),
      meterStartWh: MeterReader.earliestEnergy(readings)?.meterWh ?? null,
      ocppTransactionRef: event.transactionInfo.transactionId,
    });
  }

  /** Who the session is for: nobody yet when the event carried no token (an empty tag, filled in later). */
  private static identityOf(
    decision: (TagDecision & { commandId: string | null; idTag: string }) | null,
  ): SessionIdentity {
    if (!decision) {
      return { idTag: '', driverId: null, rfidCardId: null, commandId: null };
    }
    return {
      idTag: decision.idTag,
      driverId: decision.driverId,
      rfidCardId: decision.cardId,
      commandId: decision.commandId,
    };
  }
}
