import { AccountState, HoldState, ReceivedEvent, RefundState } from '../gateway/payment-gateway';
import { PaymentGatewayError } from '../gateway/payment-gateway.error';

/** What a fake webhook body looks like: the provider's event id and type, and which object it is about. */
export interface FakeWebhook {
  id: string;
  type: string;
  account: string | null;
  object_id: string;
}

/** Reads a fake webhook: the event's meaning is the current state of the object it names, as Stripe's are. */
export class FakeWebhooks {
  constructor(
    private readonly holds: Map<string, HoldState>,
    private readonly refunds: Map<string, RefundState>,
    private readonly accounts: Map<string, AccountState>,
  ) {}

  parse(body: FakeWebhook): ReceivedEvent {
    const base = {
      id: body.id,
      type: body.type,
      accountId: body.account,
      createdAt: new Date(),
      payload: body,
    };
    if (body.type.startsWith('payment_intent.')) {
      const hold = this.holds.get(body.object_id);
      if (!hold) {
        throw new PaymentGatewayError('provider_error', `No such hold: ${body.object_id}`);
      }
      return { ...base, event: { kind: 'hold_changed', hold } };
    }
    if (body.type.startsWith('refund.')) {
      const refund = this.refunds.get(body.object_id);
      return refund
        ? { ...base, event: { kind: 'refund_changed', refund } }
        : { ...base, event: { kind: 'ignored' } };
    }
    if (body.type === 'account.updated') {
      const account = this.accounts.get(body.object_id);
      if (!account) {
        throw new PaymentGatewayError('provider_error', `No such account: ${body.object_id}`);
      }
      return { ...base, event: { kind: 'account_changed', account } };
    }
    return { ...base, event: { kind: 'ignored' } };
  }
}
