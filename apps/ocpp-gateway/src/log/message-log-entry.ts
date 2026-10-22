/** One frame to append to ocpp_messages. */
export interface MessageLogEntry {
  tenantId: string;
  chargerId: string;
  direction: 'in' | 'out';
  messageType: 'call' | 'call_result' | 'call_error';
  messageId: string;
  action: string;
  payload: unknown;
  errorCode: string | null;
  receivedAt: Date;
}
