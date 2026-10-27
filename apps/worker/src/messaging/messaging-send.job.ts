import { Injectable } from '@nestjs/common';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { TenantIterator } from '../jobs/tenant-iterator';
import { MessageSender } from './message-sender';

/** MessagingSendJob (module 17): every few seconds, sends the chat messages that are due. */
@Injectable()
export class MessagingSendJob extends IntervalJob {
  constructor(
    private readonly config: WorkerConfig,
    private readonly tenants: TenantIterator,
    private readonly sender: MessageSender,
  ) {
    super();
  }

  async runOnce(now: Date): Promise<number> {
    let sent = 0;
    for (const tenantId of await this.tenants.ids()) {
      sent += await this.sender.sendDue(tenantId, now);
    }
    return sent;
  }

  protected intervalMs(): number {
    return this.config.messagingIntervalMs;
  }
}
