/** One ocpp_messages row as the repository returns it. */
export interface OcppMessageRecord {
  id: string;
  chargerId: string;
  direction: 'in' | 'out';
  messageType: 'call' | 'call_result' | 'call_error';
  messageId: string;
  action: string;
  payload: unknown;
  errorCode: string | null;
  receivedAt: Date;
}
