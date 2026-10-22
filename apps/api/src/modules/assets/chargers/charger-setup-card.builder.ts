import { Injectable } from '@nestjs/common';
import { ApiConfig } from '../../../config/api.config';
import { ChargerRecord } from './charger-record';
import { ChargerSetupCardDto } from './dto/charger-setup-card.dto';

/** Puts the gateway address, identity and (once) the password on a setup card (story AST-02). */
@Injectable()
export class ChargerSetupCardBuilder {
  constructor(private readonly config: ApiConfig) {}

  build(charger: ChargerRecord, password: string | null): ChargerSetupCardDto {
    return new ChargerSetupCardDto({
      ocppUrl: ChargerSetupCardBuilder.join(this.config.ocppUrl, charger.ocppIdentity),
      ocppPlainUrl: charger.allowPlainWs
        ? ChargerSetupCardBuilder.join(this.config.ocppPlainUrl, charger.ocppIdentity)
        : null,
      identity: charger.ocppIdentity,
      password,
    });
  }

  private static join(baseUrl: string, identity: string): string {
    return `${baseUrl.replace(/\/+$/, '')}/${encodeURIComponent(identity)}`;
  }
}
