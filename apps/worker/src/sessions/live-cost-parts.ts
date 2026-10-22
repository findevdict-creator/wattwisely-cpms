import { Injectable } from '@nestjs/common';
import { HoldWatcher } from '@wattwisely/payments';
import { ChargerEventNotifier, SessionPricer, SessionStore } from '@wattwisely/session-engine';

/** The session engine and payment pieces the live cost job uses, handed over together. */
@Injectable()
export class LiveCostParts {
  constructor(
    readonly pricer: SessionPricer,
    readonly sessions: SessionStore,
    readonly notifier: ChargerEventNotifier,
    readonly holds: HoldWatcher,
  ) {}
}
