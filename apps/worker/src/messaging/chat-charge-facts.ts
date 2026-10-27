import { ChatChargeFacts } from '@wattwisely/messaging';
import { MoneyText } from '@wattwisely/reports';
import { LinkedConversation } from './messaging.repository';

/** Turns a linked charge's row into the facts the chat texts mention. */
export class ChatChargeFactsBuilder {
  static build(linked: LinkedConversation, now: Date): ChatChargeFacts {
    const until = linked.endedAt ?? now;
    const hasCost = linked.currency !== null && linked.grossAmount !== null;
    return {
      place: `${linked.chargerIdentity} plug ${linked.ocppConnectorId}`,
      energyKwh: linked.energyWh / 1000,
      minutes: Math.max(0, Math.round((until.getTime() - linked.startedAt.getTime()) / 60_000)),
      cost: hasCost ? MoneyText.withCode(linked.grossAmount ?? 0, linked.currency ?? '') : null,
    };
  }
}
