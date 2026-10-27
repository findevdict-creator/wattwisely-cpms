import authorize from './schemas/v16/Authorize.json';
import authorizeResponse from './schemas/v16/AuthorizeResponse.json';
import bootNotification from './schemas/v16/BootNotification.json';
import bootNotificationResponse from './schemas/v16/BootNotificationResponse.json';
import changeAvailabilityResponse from './schemas/v16/ChangeAvailabilityResponse.json';
import clearChargingProfileResponse from './schemas/v16/ClearChargingProfileResponse.json';
import heartbeat from './schemas/v16/Heartbeat.json';
import heartbeatResponse from './schemas/v16/HeartbeatResponse.json';
import idTagInfo from './schemas/v16/IdTagInfo.json';
import meterValue from './schemas/v16/MeterValue.json';
import meterValues from './schemas/v16/MeterValues.json';
import meterValuesResponse from './schemas/v16/MeterValuesResponse.json';
import remoteStartTransactionResponse from './schemas/v16/RemoteStartTransactionResponse.json';
import remoteStopTransactionResponse from './schemas/v16/RemoteStopTransactionResponse.json';
import resetResponse from './schemas/v16/ResetResponse.json';
import setChargingProfileResponse from './schemas/v16/SetChargingProfileResponse.json';
import startTransaction from './schemas/v16/StartTransaction.json';
import startTransactionResponse from './schemas/v16/StartTransactionResponse.json';
import statusNotification from './schemas/v16/StatusNotification.json';
import statusNotificationResponse from './schemas/v16/StatusNotificationResponse.json';
import stopTransaction from './schemas/v16/StopTransaction.json';
import stopTransactionResponse from './schemas/v16/StopTransactionResponse.json';
import unlockConnectorResponse from './schemas/v16/UnlockConnectorResponse.json';

/**
 * The OCPP 1.6J JSON schemas the gateway validates with, keyed by message name:
 * the requests chargers send, the responses the gateway sends back, and the
 * responses chargers give to the gateway's commands. Shapes follow the Open Charge
 * Alliance's schema files; shared pieces (IdTagInfo, MeterValue) are referenced by name.
 */
export class V16Schemas {
  static readonly SHARED: Record<string, object> = {
    IdTagInfo: idTagInfo,
    MeterValue: meterValue,
  };

  static readonly MESSAGES: Record<string, object> = {
    Authorize: authorize,
    AuthorizeResponse: authorizeResponse,
    BootNotification: bootNotification,
    BootNotificationResponse: bootNotificationResponse,
    ChangeAvailabilityResponse: changeAvailabilityResponse,
    ClearChargingProfileResponse: clearChargingProfileResponse,
    Heartbeat: heartbeat,
    HeartbeatResponse: heartbeatResponse,
    MeterValues: meterValues,
    MeterValuesResponse: meterValuesResponse,
    RemoteStartTransactionResponse: remoteStartTransactionResponse,
    RemoteStopTransactionResponse: remoteStopTransactionResponse,
    ResetResponse: resetResponse,
    SetChargingProfileResponse: setChargingProfileResponse,
    StartTransaction: startTransaction,
    StartTransactionResponse: startTransactionResponse,
    StatusNotification: statusNotification,
    StatusNotificationResponse: statusNotificationResponse,
    StopTransaction: stopTransaction,
    StopTransactionResponse: stopTransactionResponse,
    UnlockConnectorResponse: unlockConnectorResponse,
  };
}
