import { Injectable } from '@nestjs/common';
import { GatewayConfig } from '../../config/gateway.config';
import { ChargerIdentity } from '../../storage/charger-identity';
import { UpgradeRefusal } from '../upgrade-refusal';
import { UpgradeRequest } from '../upgrade-request';

/** Plain ws:// is only for chargers marked allow_plain_ws (check 3), unless TLS is not required at all (local trials). */
@Injectable()
export class TransportCheck {
  constructor(private readonly config: GatewayConfig) {}

  check(request: UpgradeRequest, charger: ChargerIdentity): void {
    if (this.config.isTlsRequired && !request.isSecure && !charger.allowPlainWs) {
      throw new UpgradeRefusal(403, 'plain_ws_not_allowed');
    }
  }
}
