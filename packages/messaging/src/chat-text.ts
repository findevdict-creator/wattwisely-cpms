import { ChatButton, ChatReply } from './messaging-provider';
import { ChatCommandParser } from './chat-command';

/** What the chat knows about a charge when it writes about it. */
export interface ChatChargeFacts {
  /** The plug as drivers see it: "ACME-1 plug 1". */
  place: string;
  energyKwh: number;
  /** Minutes charging so far, or in total once finished. */
  minutes: number;
  /** The price so far, already formatted ("£4.20"), or null when the tariff is free or unknown. */
  cost: string | null;
}

/**
 * The words the platform sends to drivers (module 17), kept together so the API's chat
 * handler and the worker's notifier say the same things. English only in this module.
 */
export class ChatText {
  static readonly STOP_BUTTON: ChatButton = {
    id: ChatCommandParser.BUTTON_STOP,
    title: 'Stop charging',
  };
  static readonly STATUS_BUTTON: ChatButton = {
    id: ChatCommandParser.BUTTON_STATUS,
    title: 'Status',
  };

  static greeting(tenantName: string, greeting: string): string {
    const opening = greeting.trim() || `Hi, this is ${tenantName}.`;
    return `${opening}\nTo charge, scan the QR code on the plug or send its code, for example "charge WW-7KQ4M2XR9T/1".`;
  }

  static help(): string {
    return 'I can start a charge from a plug code like "charge WW-7KQ4M2XR9T/1", tell you the status of your charge, or stop it. Send "status" or "stop" any time.';
  }

  static unknownPlug(): string {
    return 'I could not find that plug. Check the code printed on the charger and send it again, like "charge WW-7KQ4M2XR9T/1".';
  }

  static plugBusy(place: string): string {
    return `${place} is in use right now. Try another plug, or send "status" if the charge is yours.`;
  }

  static plugUnavailable(place: string): string {
    return `${place} is not available at the moment. Please try another plug.`;
  }

  static plugReady(place: string, url: string): ChatReply {
    return {
      text: `${place} is ready. Tap the link to pay and start charging:\n${url}\nI will message you here when the charge starts and when it ends.`,
    };
  }

  static started(facts: ChatChargeFacts): ChatReply {
    return {
      text: `Charging has started at ${facts.place}. Send "stop" or tap the button when you want to end it.`,
      buttons: [ChatText.STOP_BUTTON, ChatText.STATUS_BUTTON],
    };
  }

  static status(facts: ChatChargeFacts): ChatReply {
    const cost = facts.cost ? `, ${facts.cost} so far` : '';
    return {
      text: `Charging at ${facts.place}: ${facts.energyKwh.toFixed(1)} kWh in ${facts.minutes} min${cost}.`,
      buttons: [ChatText.STOP_BUTTON],
    };
  }

  static settingUp(place: string): string {
    return `Your charge at ${place} is being set up. I will tell you here when the charger starts.`;
  }

  static noCharge(): string {
    return 'You have no charge running. Scan the QR code on a plug or send its code to start one.';
  }

  static stopping(place: string): string {
    return `Stopping the charge at ${place}. You will get a receipt here when it is done.`;
  }

  static finished(facts: ChatChargeFacts, receiptUrl: string | null): string {
    const cost = facts.cost ? ` for ${facts.cost}` : '';
    const receipt = receiptUrl ? `\nYour receipt: ${receiptUrl}` : '';
    return `Your charge at ${facts.place} has ended: ${facts.energyKwh.toFixed(1)} kWh in ${facts.minutes} min${cost}.${receipt}`;
  }

  static notStarted(place: string): string {
    return `The charge at ${place} did not start, so nothing was charged to your card. You can try again by sending the plug code.`;
  }

  static test(tenantName: string): string {
    return `This is a test message from ${tenantName} on Wattwisely. Your WhatsApp channel works.`;
  }
}
