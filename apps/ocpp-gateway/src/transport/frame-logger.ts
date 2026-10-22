import { Injectable } from '@nestjs/common';
import { ChargerConnection } from '../connection/charger-connection';
import { MessageLogWriter } from '../log/message-log.writer';
import { OcppCallError } from './ocpp-call-error';
import { OcppFrame } from './ocpp-frame';

/** Puts every frame of a connection on the message log, in the shape ocpp_messages wants. */
@Injectable()
export class FrameLogger {
  constructor(private readonly log: MessageLogWriter) {}

  incoming(connection: ChargerConnection, frame: OcppFrame, action: string): void {
    this.log.record({
      tenantId: connection.charger.tenantId,
      chargerId: connection.charger.id,
      direction: 'in',
      messageType: frame.type,
      messageId: frame.id,
      action,
      payload: frame.type === 'call_error' ? frame.details : frame.payload,
      errorCode: frame.type === 'call_error' ? frame.code : null,
      receivedAt: new Date(),
    });
  }

  result(connection: ChargerConnection, id: string, action: string, payload: unknown): void {
    this.log.record({
      tenantId: connection.charger.tenantId,
      chargerId: connection.charger.id,
      direction: 'out',
      messageType: 'call_result',
      messageId: id,
      action,
      payload,
      errorCode: null,
      receivedAt: new Date(),
    });
  }

  error(connection: ChargerConnection, id: string, action: string, error: OcppCallError): void {
    this.log.record({
      tenantId: connection.charger.tenantId,
      chargerId: connection.charger.id,
      direction: 'out',
      messageType: 'call_error',
      messageId: id,
      action,
      payload: { description: error.description, details: error.details },
      errorCode: error.code,
      receivedAt: new Date(),
    });
  }
}
