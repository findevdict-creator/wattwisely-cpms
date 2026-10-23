import { Module } from '@nestjs/common';
import { HoldWatcher } from '@wattwisely/payments';
import {
  ChargerEventNotifier,
  SessionFinaliser,
  SessionPricer,
  SessionStore,
} from '@wattwisely/session-engine';
import { SessionBatch } from '../jobs/session-batch';
import { TenantIterator } from '../jobs/tenant-iterator';
import { LiveCostJob } from './live-cost.job';
import { LiveCostParts } from './live-cost-parts';
import { SessionFinaliseJob } from './session-finalise.job';
import { StaleSessionSweepJob } from './stale-session-sweep.job';

/** The session jobs and the shared session engine pieces they use. */
@Module({
  providers: [
    { provide: SessionStore, useValue: new SessionStore() },
    { provide: SessionPricer, useValue: new SessionPricer() },
    { provide: SessionFinaliser, useValue: new SessionFinaliser() },
    { provide: ChargerEventNotifier, useValue: new ChargerEventNotifier() },
    { provide: HoldWatcher, useValue: new HoldWatcher() },
    TenantIterator,
    SessionBatch,
    LiveCostParts,
    SessionFinaliseJob,
    LiveCostJob,
    StaleSessionSweepJob,
  ],
  exports: [TenantIterator, SessionBatch],
})
export class SessionJobsModule {}
