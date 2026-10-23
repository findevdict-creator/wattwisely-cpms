import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { CommandQueuer } from '@wattwisely/payments';
import { SessionStates, SessionStore } from '@wattwisely/session-engine';
import { ChargeKeyResolver } from '../../payments/public/charge-key.resolver';
import { ChargeViewBuilder } from '../../payments/public/charge-view.builder';
import { ChargeDto } from '../../payments/public/dto/charge.dto';
import { StopCommandLookup } from '../../payments/public/stop-command.lookup';
import { DriverErrors } from '../driver-errors';

/**
 * The driver asks the charger to stop, from the page that holds the charge key. The
 * RemoteStop is queued like a staff member's (module 4); the session moves on when the
 * charger reports the stop, and the worker then prices it and settles the hold. Asking
 * twice queues nothing new.
 */
@Injectable()
export class ChargeStopService {
  private readonly keys = new ChargeKeyResolver();
  private readonly sessions = new SessionStore();
  private readonly commands = new CommandQueuer();
  private readonly stops = new StopCommandLookup();

  constructor(
    private readonly runner: TransactionRunner,
    private readonly views: ChargeViewBuilder,
  ) {}

  /** 409 charge_not_running unless the charger has started the transaction and not stopped it. */
  async stop(key: string): Promise<ChargeDto> {
    const parsed = this.keys.parse(key);
    return this.runner.run(DatabaseSession.forTenant(parsed.tenantId), async (tx) => {
      const payment = await this.keys.resolve(tx, parsed);
      const session = await this.sessions.find(tx, payment.sessionId);
      if (
        !session ||
        !SessionStates.isActive(session.status) ||
        session.ocppTransactionId === null
      ) {
        throw DriverErrors.chargeNotRunning();
      }
      if (!(await this.stops.isPending(tx, session.id))) {
        await this.commands.remoteStop(tx, session, session.ocppTransactionId);
      }
      return this.views.build(tx, payment, key);
    });
  }
}
