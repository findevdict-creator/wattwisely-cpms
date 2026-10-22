import { Injectable } from '@nestjs/common';
import { GatewayConfig } from '../config/gateway.config';
import { IdTagStatus } from '../adapters/v16/v16-messages';
import { IssuedTagRegistry } from './issued-tag.registry';

/**
 * Who may start a charge in M1: a tag the platform issued for a remote start, or
 * anyone when OCPP_ACCEPT_UNKNOWN_ID_TAGS is on (bench testing). Drivers' RFID cards
 * and app tokens arrive with the drivers module.
 */
@Injectable()
export class TagPolicy {
  constructor(
    private readonly issued: IssuedTagRegistry,
    private readonly config: GatewayConfig,
  ) {}

  decide(chargerId: string, idTag: string): IdTagStatus {
    if (this.config.isAnyIdTagAccepted || this.issued.isIssued(chargerId, idTag)) {
      return 'Accepted';
    }
    return 'Invalid';
  }

  /** At StartTransaction: the verdict, and the remote start command behind the tag if there is one. */
  start(chargerId: string, idTag: string): { status: IdTagStatus; commandId: string | null } {
    const status = this.decide(chargerId, idTag);
    return { status, commandId: this.issued.take(chargerId, idTag) };
  }
}
