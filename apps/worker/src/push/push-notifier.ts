import { Inject, Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { PUSH_SENDER, PushMessage, PushSender, PushTarget } from '@wattwisely/push';
import { PushComposer } from './push-composer';
import { PushDeliveriesRepository } from './push-deliveries.repository';
import { PushEventRules } from './push-event.rules';
import { PushWatchRepository } from './push-watch.repository';

/** A push claimed in the first transaction, sent outside it. */
interface ClaimedPush {
  deliveryId: string;
  targets: PushTarget[];
  message: PushMessage;
}

/**
 * Sends one tenant's due pushes (module 34). One transaction claims them, each once, with the
 * phones to send to; they go out with no transaction open, since the services can be slow;
 * a second one records how each went and forgets the phones the services no longer know.
 * A push lost to a crash between the two is not sent again: pushes are best-effort.
 */
@Injectable()
export class PushNotifier {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly watch: PushWatchRepository,
    private readonly deliveries: PushDeliveriesRepository,
    @Inject(PUSH_SENDER) private readonly sender: PushSender,
  ) {}

  /** How many pushes reached at least one phone. */
  async run(tenantId: string, now: Date): Promise<number> {
    const session = DatabaseSession.forTenant(tenantId);
    const claimed = await this.runner.run(session, (tx) => this.claim(tx, tenantId, now));
    const outcomes = await Promise.all(claimed.map((push) => this.send(push)));
    await this.runner.run(session, async (tx) => {
      for (const [index, outcome] of outcomes.entries()) {
        await this.deliveries.finish(tx, claimed[index].deliveryId, outcome.error);
        for (const token of outcome.invalidTokens) {
          await this.deliveries.markInvalid(tx, token);
        }
      }
    });
    return outcomes.filter((outcome) => !outcome.error).length;
  }

  private async claim(tx: Transaction, tenantId: string, now: Date): Promise<ClaimedPush[]> {
    const claimed: ClaimedPush[] = [];
    for (const session of await this.watch.findWatched(tx, now)) {
      for (const kind of PushEventRules.due(session, now)) {
        const { sessionId, driverAccountId } = session;
        const deliveryId = await this.deliveries.claim(tx, {
          tenantId,
          sessionId,
          kind,
          driverAccountId,
        });
        if (deliveryId) {
          const targets = await this.deliveries.devices(tx, driverAccountId);
          claimed.push({ deliveryId, targets, message: PushComposer.message(kind, session) });
        }
      }
    }
    return claimed;
  }

  /** The error when no phone took the push, and the tokens to forget. */
  private async send(
    push: ClaimedPush,
  ): Promise<{ error: string | null; invalidTokens: string[] }> {
    const targets = push.targets.filter((target) => this.sender.isEnabled(target.platform));
    const results = await Promise.all(
      targets.map((target) => this.sender.send(target, push.message)),
    );
    const invalidTokens = targets
      .filter((_, index) => results[index].isTokenInvalid)
      .map((target) => target.token);
    const isSent = results.some((result) => result.isSent);
    const error = results.find((result) => result.error)?.error ?? 'No phone takes pushes.';
    return { error: isSent ? null : error, invalidTokens };
  }
}
