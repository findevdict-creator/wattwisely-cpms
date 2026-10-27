import { MessagingButton } from '@wattwisely/db';

/** A tenant's chat channel as stored; the token itself never leaves the database. */
export interface ChannelRecord {
  id: string;
  tenantId: string;
  provider: 'whatsapp';
  phoneNumberId: string;
  displayPhoneNumber: string;
  hasAccessToken: boolean;
  greeting: string;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/** A driver's conversation, with the plug and charge it is about. */
export interface ConversationRecord {
  id: string;
  contact: string;
  chargerIdentity: string | null;
  ocppConnectorId: number | null;
  sessionId: string;
  sessionStatus: string | null;
  linkToken: string;
  lastInboundAt: Date | null;
  lastOutboundAt: Date | null;
  updatedAt: Date;
}

/** One message in a conversation, either way. */
export interface MessageRecord {
  id: string;
  direction: 'in' | 'out';
  status: string;
  body: string;
  buttons: MessagingButton[] | null;
  error: string | null;
  sentAt: Date | null;
  createdAt: Date;
}
