import { ClearChargingProfilePayload, SetChargingProfilePayload } from '@wattwisely/ocpp-contracts';

/**
 * Load management's power cap as OCPP 2.0.1 SmartCharging sees it (module 17's command,
 * module 18's wire format): one ChargingStationMaxProfile on EVSE 0, the whole station,
 * with a single schedule of one period that never ends, in watts. The same profile id
 * set again replaces the cap; ClearChargingProfile by that id removes it.
 */
export class V201ChargingProfile {
  static readonly PURPOSE = 'ChargingStationMaxProfile';
  static readonly KIND = 'Absolute';
  static readonly RATE_UNIT = 'W';
  static readonly STACK_LEVEL = 0;
  static readonly SCHEDULE_ID = 1;

  static set(payload: SetChargingProfilePayload): object {
    return {
      evseId: 0,
      chargingProfile: {
        id: payload.profile_id,
        stackLevel: V201ChargingProfile.STACK_LEVEL,
        chargingProfilePurpose: V201ChargingProfile.PURPOSE,
        chargingProfileKind: V201ChargingProfile.KIND,
        chargingSchedule: [
          {
            id: V201ChargingProfile.SCHEDULE_ID,
            chargingRateUnit: V201ChargingProfile.RATE_UNIT,
            chargingSchedulePeriod: [{ startPeriod: 0, limit: payload.limit_w }],
          },
        ],
      },
    };
  }

  static clear(payload: ClearChargingProfilePayload): object {
    return { chargingProfileId: payload.profile_id };
  }
}
