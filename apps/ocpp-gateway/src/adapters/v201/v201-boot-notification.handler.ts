import { Injectable } from '@nestjs/common';
import { GatewayConfig } from '../../config/gateway.config';
import { BootFollowUp } from '../../connection/boot-follow-up';
import { ChargerConnection } from '../../connection/charger-connection';
import { ActionHandler, HandlerResult } from '../action-handler';
import { BootRecorder, BootReport } from '../boot-recorder';
import { BootNotificationRequest201 } from './v201-messages';

/**
 * BootNotification (2.0.1): the charging station describes itself under `chargingStation`
 * and says why it booted. The verdict, the heartbeat interval and what follows are the
 * same as in 1.6; only the field names differ.
 */
@Injectable()
export class V201BootNotificationHandler implements ActionHandler {
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
      V201BootNotificationHandler.toReport(payload as BootNotificationRequest201),
      interval,
    );
    const isAccepted = verdict.status === 'accepted';
    connection.isBooted = isAccepted;
    connection.heartbeatIntervalS = interval;
    return {
      reply: {
        currentTime: new Date().toISOString(),
        interval,
        status: isAccepted ? 'Accepted' : 'Rejected',
      },
      after: () =>
        isAccepted ? this.followUp.accepted(connection) : this.followUp.rejected(connection),
    };
  }

  /** 2.0.1 has one serial number and no meter fields; the modem's identifiers sit in their own object. */
  static toReport(payload: BootNotificationRequest201): BootReport {
    const station = payload.chargingStation;
    return {
      vendor: station.vendorName,
      model: station.model,
      chargePointSerial: station.serialNumber ?? null,
      chargeBoxSerial: null,
      firmwareVersion: station.firmwareVersion ?? null,
      iccid: station.modem?.iccid ?? null,
      imsi: station.modem?.imsi ?? null,
      meterType: null,
      meterSerial: null,
    };
  }
}
