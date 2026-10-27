import { ClearChargingProfilePayload, SetChargingProfilePayload } from '@wattwisely/ocpp-contracts';

/**
 * Load management's power cap as OCPP 1.6 SmartCharging sees it (module 17): one
 * ChargePointMaxProfile on connector 0 with a single period that never ends, so the whole
 * charger stays under the limit. Setting the same profile id again replaces the cap;
 * ClearChargingProfile by that id removes it.
 */
export class V16ChargingProfile {
  static readonly PURPOSE = 'ChargePointMaxProfile';
  static readonly KIND = 'Absolute';
  static readonly RATE_UNIT = 'W';
  static readonly STACK_LEVEL = 0;

  static set(payload: SetChargingProfilePayload): object {
    return {
      connectorId: 0,
      csChargingProfiles: {
        chargingProfileId: payload.profile_id,
        stackLevel: V16ChargingProfile.STACK_LEVEL,
        chargingProfilePurpose: V16ChargingProfile.PURPOSE,
        chargingProfileKind: V16ChargingProfile.KIND,
        chargingSchedule: {
          chargingRateUnit: V16ChargingProfile.RATE_UNIT,
          chargingSchedulePeriod: [{ startPeriod: 0, limit: payload.limit_w }],
        },
      },
    };
  }

  static clear(payload: ClearChargingProfilePayload): object {
    return {
      id: payload.profile_id,
      connectorId: 0,
      chargingProfilePurpose: V16ChargingProfile.PURPOSE,
    };
  }
}
