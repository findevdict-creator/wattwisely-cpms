import { ChatCommandParser } from './chat-command';

/**
 * The link on a plug's sticker that opens WhatsApp with the plug already named (module 17):
 * https://wa.me/<number>?text=charge%20WW-7KQ4M2XR9T%2F1. The driver only has to send it.
 */
export class WhatsAppLink {
  static readonly BASE_URL = 'https://wa.me';

  static forPlug(displayPhoneNumber: string, identity: string, ocppConnectorId: number): string {
    const digits = displayPhoneNumber.replace(/\D/g, '');
    const text = encodeURIComponent(ChatCommandParser.plugText(identity, ocppConnectorId));
    return `${WhatsAppLink.BASE_URL}/${digits}?text=${text}`;
  }

  /** "+44 7700 900123" from "447700900123": the number as drivers read it. */
  static displayed(displayPhoneNumber: string): string {
    const digits = displayPhoneNumber.replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }
}
