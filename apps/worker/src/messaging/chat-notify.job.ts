import { Injectable } from '@nestjs/common';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { TenantIterator } from '../jobs/tenant-iterator';
import { ChatSessionNotifier } from './chat-session-notifier';

/** ChatNotifyJob (module 17): every few seconds, queues the chat messages linked charges are due. */
@Injectable()
export class ChatNotifyJob extends IntervalJob {
  constructor(
    private readonly config: WorkerConfig,
    private readonly tenants: TenantIterator,
    private readonly notifier: ChatSessionNotifier,
  ) {
    super();
  }

  async runOnce(now: Date): Promise<number> {
    let queued = 0;
    for (const tenantId of await this.tenants.ids()) {
      queued += await this.notifier.run(tenantId, now);
    }
    return queued;
  }

  protected intervalMs(): number {
    return this.config.messagingIntervalMs;
  }
}
