import { LoadStrategy } from '@wattwisely/load-management';
import { ChargerStatus } from '../assets/chargers/charger-status';

/** A site's load policy as stored; `version` 0 stands for "none yet". */
export interface LoadPolicyRecord {
  siteId: string;
  isEnabled: boolean;
  limitKw: number;
  strategy: LoadStrategy;
  minPowerKw: number;
  version: number;
  updatedAt: Date | null;
}

/** A charger at the site with its load settings and the cap it last got. */
export interface LoadChargerRecord {
  id: string;
  identity: string;
  status: ChargerStatus;
  isOnline: boolean;
  priority: number;
  /** The ceiling staff set, in kW; null means the connectors' total is used. */
  maxPowerKw: number | null;
  /** The sum of the connectors' max_power_kw, when they report one. */
  connectorsMaxKw: number | null;
  allocation: {
    limitW: number;
    reason: string;
    isCharging: boolean;
    isApplied: boolean;
    appliedAt: Date | null;
    lastError: string | null;
  } | null;
}
