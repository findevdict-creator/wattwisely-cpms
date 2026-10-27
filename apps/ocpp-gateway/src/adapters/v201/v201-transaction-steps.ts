import { Injectable } from '@nestjs/common';
import { V201ChargingStateApplier } from './v201-charging-state.applier';
import { V201TransactionEnder } from './v201-transaction-ender';
import { V201TransactionStarter } from './v201-transaction-starter';
import { V201TransactionUpdater } from './v201-transaction-updater';

/** The four things a TransactionEvent can mean for a session, handed to the handler together. */
@Injectable()
export class V201TransactionSteps {
  constructor(
    readonly starter: V201TransactionStarter,
    readonly updater: V201TransactionUpdater,
    readonly ender: V201TransactionEnder,
    readonly chargingState: V201ChargingStateApplier,
  ) {}
}
