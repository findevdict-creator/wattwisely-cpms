import authorize from './schemas/v201/Authorize.json';
import authorizeResponse from './schemas/v201/AuthorizeResponse.json';
import bootNotification from './schemas/v201/BootNotification.json';
import bootNotificationResponse from './schemas/v201/BootNotificationResponse.json';
import changeAvailabilityResponse from './schemas/v201/ChangeAvailabilityResponse.json';
import clearChargingProfileResponse from './schemas/v201/ClearChargingProfileResponse.json';
import evse from './schemas/v201/EVSE.json';
import firmwareStatusNotification from './schemas/v201/FirmwareStatusNotification.json';
import heartbeat from './schemas/v201/Heartbeat.json';
import heartbeatResponse from './schemas/v201/HeartbeatResponse.json';
import idToken from './schemas/v201/IdToken.json';
import idTokenInfo from './schemas/v201/IdTokenInfo.json';
import logStatusNotification from './schemas/v201/LogStatusNotification.json';
import meterValue from './schemas/v201/MeterValue.json';
import meterValues from './schemas/v201/MeterValues.json';
import meterValuesResponse from './schemas/v201/MeterValuesResponse.json';
import notifyEvent from './schemas/v201/NotifyEvent.json';
import requestStartTransactionResponse from './schemas/v201/RequestStartTransactionResponse.json';
import requestStopTransactionResponse from './schemas/v201/RequestStopTransactionResponse.json';
import resetResponse from './schemas/v201/ResetResponse.json';
import securityEventNotification from './schemas/v201/SecurityEventNotification.json';
import setChargingProfileResponse from './schemas/v201/SetChargingProfileResponse.json';
import statusNotification from './schemas/v201/StatusNotification.json';
import statusNotificationResponse from './schemas/v201/StatusNotificationResponse.json';
import transactionEvent from './schemas/v201/TransactionEvent.json';
import transactionEventResponse from './schemas/v201/TransactionEventResponse.json';
import unlockConnectorResponse from './schemas/v201/UnlockConnectorResponse.json';

/**
 * The OCPP 2.0.1 JSON schemas the gateway validates with, keyed by message name (module
 * 18): the requests charging stations send, the responses the gateway sends back, and
 * the responses stations give to the gateway's commands. Shapes follow the Open Charge
 * Alliance's schema files for the fields the platform reads or a station is bound to
 * send; every message takes `customData`, as the spec allows. Shared pieces (IdToken,
 * IdTokenInfo, MeterValue, EVSE) are referenced by name.
 */
export class V201Schemas {
  static readonly SHARED: Record<string, object> = {
    IdToken: idToken,
    IdTokenInfo: idTokenInfo,
    MeterValue: meterValue,
    EVSE: evse,
  };

  static readonly MESSAGES: Record<string, object> = {
    Authorize: authorize,
    AuthorizeResponse: authorizeResponse,
    BootNotification: bootNotification,
    BootNotificationResponse: bootNotificationResponse,
    ChangeAvailabilityResponse: changeAvailabilityResponse,
    ClearChargingProfileResponse: clearChargingProfileResponse,
    FirmwareStatusNotification: firmwareStatusNotification,
    Heartbeat: heartbeat,
    HeartbeatResponse: heartbeatResponse,
    LogStatusNotification: logStatusNotification,
    MeterValues: meterValues,
    MeterValuesResponse: meterValuesResponse,
    NotifyEvent: notifyEvent,
    RequestStartTransactionResponse: requestStartTransactionResponse,
    RequestStopTransactionResponse: requestStopTransactionResponse,
    ResetResponse: resetResponse,
    SecurityEventNotification: securityEventNotification,
    SetChargingProfileResponse: setChargingProfileResponse,
    StatusNotification: statusNotification,
    StatusNotificationResponse: statusNotificationResponse,
    TransactionEvent: transactionEvent,
    TransactionEventResponse: transactionEventResponse,
    UnlockConnectorResponse: unlockConnectorResponse,
  };
}
