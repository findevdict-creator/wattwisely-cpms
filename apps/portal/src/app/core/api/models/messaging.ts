/** GET /v1/messaging/channel: the company's WhatsApp number (module 17). Version 0 until saved. */
export interface MessagingChannel {
  provider: 'whatsapp';
  phone_number_id: string;
  display_phone_number: string;
  has_access_token: boolean;
  is_platform_token_configured: boolean;
  greeting: string;
  is_active: boolean;
  webhook_url: string;
  version: number;
  updated_at: string | null;
}

/** Body of PUT /v1/messaging/channel; leave access_token out to keep the stored one. */
export interface MessagingChannelInput {
  phone_number_id: string;
  display_phone_number: string;
  access_token?: string;
  greeting: string;
  is_active: boolean;
}

/** GET /v1/messaging/conversations: a driver's chat. */
export interface Conversation {
  id: string;
  contact: string;
  charger_identity: string | null;
  ocpp_connector_id: number | null;
  session_id: string | null;
  session_status: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  updated_at: string;
}

/** GET /v1/messaging/conversations/{id}/messages: one message either way. */
export interface ChatMessage {
  id: string;
  direction: 'in' | 'out';
  status: 'pending' | 'sent' | 'failed' | 'received';
  body: string;
  buttons: string[];
  error: string | null;
  sent_at: string | null;
  created_at: string;
}
