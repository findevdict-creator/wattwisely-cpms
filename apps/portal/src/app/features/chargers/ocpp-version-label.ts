import { Charger } from '../../core/api/models/charger';

/** A charger's OCPP version as people read it. OCPP 1.6 over WebSocket is the JSON flavour, 1.6J. */
export class OcppVersionLabel {
  static of(version: Charger['ocpp_version']): string | null {
    if (!version) {
      return null;
    }
    return `OCPP ${version === '1.6' ? '1.6J' : version}`;
  }
}
