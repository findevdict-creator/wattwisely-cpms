import { Injectable } from '@nestjs/common';
import { GatewayConfig } from '../../config/gateway.config';
import { ChargerConnection } from '../../connection/charger-connection';
import { ActionHandler, HandlerResult } from '../action-handler';
import { BootFollowUp } from '../../connection/boot-follow-up';
import { BootRecorder, BootReport } from '../boot-recorder';
import { BootNotificationRequest } from './v16-messages';

/**
 * BootNotification: the first message on every connection. Accepted chargers get the
 * heartbeat interval and may send everything else; rejected ones (fingerprint mismatch)
 * are disconnected shortly after.
 */
@Injectable()
export class V16BootNotificationHandler implements ActionHandler {
  readonly action = 'BootNotification';

  constructor(
    private readonly recorder: BootRecorder,
    private readonly followUp: BootFollowUp,
    private readonly config: GatewayConfig,
  ) {}

  async handle(connection: ChargerConnection, payload: unknown): Promise<HandlerResult> {
    const interval = this.config.heartbeatIntervalS;
    const verdict = await this.recorder.record(
      connection,
      V16BootNotificationHandler.toReport(payload as BootNotificationRequest),
      interval,
    );
    const isAccepted = verdict.status === 'accepted';
    connection.isBooted = isAccepted;
    connection.heartbeatIntervalS = interval;
    return {
      reply: {
        status: isAccepted ? 'Accepted' : 'Rejected',
        currentTime: new Date().toISOString(),
        interval,
      },
      after: () =>
        isAccepted ? this.followUp.accepted(connection) : this.followUp.rejected(connection),
    };
  }

  static toReport(payload: BootNotificationRequest): BootReport {
    return {
      vendor: payload.chargePointVendor,
      model: payload.chargePointModel,
      chargePointSerial: payload.chargePointSerialNumber ?? null,
      chargeBoxSerial: payload.chargeBoxSerialNumber ?? null,
      firmwareVersion: payload.firmwareVersion ?? null,
      iccid: payload.iccid ?? null,
      imsi: payload.imsi ?? null,
      meterType: payload.meterType ?? null,
      meterSerial: payload.meterSerialNumber ?? null,
    };
  }
}
