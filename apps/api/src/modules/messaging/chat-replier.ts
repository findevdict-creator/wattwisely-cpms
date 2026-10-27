import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { ChatCommand, ChatReply, ChatText } from '@wattwisely/messaging';
import { CommandQueuer } from '@wattwisely/payments';
import { SessionRow, SessionStates, SessionStore } from '@wattwisely/session-engine';
import { MoneyText } from '@wattwisely/reports';
import { ApiConfig } from '../../config/api.config';
import { ChargeUrlBuilder } from '../drivers/qr/charge-url.builder';
import { PlaceAvailabilityPolicy } from '../drivers/places/place-availability';
import { ChargePlaceLookup } from '../payments/public/charge-place.lookup';
import { StopCommandLookup } from '../payments/public/stop-command.lookup';
import { ChatConversation, ConversationStore } from './conversation.store';
import { ChatPlug, PlugLookup } from './plug.lookup';

/**
 * What the platform answers a driver (module 17). A plug gets the link to pay on, with the
 * conversation's token so the charge comes back to this chat; stop queues the same RemoteStop
 * the driver's page would; status reads the linked session. Everything else gets the help.
 */
@Injectable()
export class ChatReplier {
  private readonly sessions = new SessionStore();
  private readonly commands = new CommandQueuer();
  private readonly stops = new StopCommandLookup();

  constructor(
    private readonly config: ApiConfig,
    private readonly plugs: PlugLookup,
    private readonly places: ChargePlaceLookup,
    private readonly conversations: ConversationStore,
  ) {}

  async reply(
    tx: Transaction,
    conversation: ChatConversation,
    command: ChatCommand,
    channel: { tenantName: string; greeting: string },
  ): Promise<ChatReply> {
    switch (command.kind) {
      case 'plug':
        return this.plug(tx, conversation, command.identity, command.ocppConnectorId);
      case 'stop':
        return this.stop(tx, conversation);
      case 'status':
        return this.status(tx, conversation);
      default:
        return {
          text: conversation.isNew
            ? ChatText.greeting(channel.tenantName, channel.greeting)
            : ChatText.help(),
        };
    }
  }

  private async plug(
    tx: Transaction,
    conversation: ChatConversation,
    identity: string,
    ocppConnectorId: number,
  ): Promise<ChatReply> {
    const plug = await this.plugs.find(tx, identity, ocppConnectorId);
    if (!plug) {
      return { text: ChatText.unknownPlug() };
    }
    const place = ChatReplier.placeOf(plug);
    const availability = PlaceAvailabilityPolicy.of({
      isOnline: plug.isOnline,
      connectorStatus: plug.connectorStatus,
      isBusy: await this.places.isBusy(tx, plug.connectorId),
    });
    if (availability === 'busy') {
      return { text: ChatText.plugBusy(place) };
    }
    if (availability !== 'available') {
      return { text: ChatText.plugUnavailable(place) };
    }
    await this.conversations.pointAt(tx, conversation.id, plug);
    return ChatText.plugReady(place, this.chargeUrl(plug, conversation.linkToken));
  }

  private async stop(tx: Transaction, conversation: ChatConversation): Promise<ChatReply> {
    const session = await this.linkedSession(tx, conversation);
    if (!session || !SessionStates.isActive(session.status) || session.ocppTransactionId === null) {
      return { text: ChatText.noCharge() };
    }
    if (!(await this.stops.isPending(tx, session.id))) {
      await this.commands.remoteStop(tx, session, session.ocppTransactionId);
    }
    return { text: ChatText.stopping(await this.placeOfSession(tx, session)) };
  }

  private async status(tx: Transaction, conversation: ChatConversation): Promise<ChatReply> {
    const session = await this.linkedSession(tx, conversation);
    if (!session || !SessionStates.WORKING.includes(session.status)) {
      return { text: ChatText.noCharge() };
    }
    if (!SessionStates.isActive(session.status) && session.status !== 'stopping') {
      return { text: ChatText.settingUp(await this.placeOfSession(tx, session)) };
    }
    const hasCost = session.currency !== null && session.grossAmount !== null;
    return ChatText.status({
      place: await this.placeOfSession(tx, session),
      energyKwh: session.energyWh / 1000,
      minutes: Math.max(0, Math.round((Date.now() - session.startedAt.getTime()) / 60_000)),
      cost: hasCost ? MoneyText.withCode(session.grossAmount ?? 0, session.currency ?? '') : null,
    });
  }

  private linkedSession(tx: Transaction, conversation: ChatConversation) {
    return conversation.sessionId ? this.sessions.find(tx, conversation.sessionId) : null;
  }

  private placeOfSession(tx: Transaction, session: SessionRow): Promise<string> {
    return this.plugs.placeOf(tx, session.connectorId);
  }

  private chargeUrl(plug: ChatPlug, linkToken: string): string {
    const base = this.config.driverUrl.replace(/\/+$/, '');
    const path = `${ChargeUrlBuilder.PATH}/${encodeURIComponent(plug.identity)}/${plug.ocppConnectorId}`;
    return `${base}/${path}?chat=${encodeURIComponent(linkToken)}`;
  }

  private static placeOf(plug: ChatPlug): string {
    return PlugLookup.label(plug.identity, plug.ocppConnectorId);
  }
}
