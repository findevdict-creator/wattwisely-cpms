import { Injectable } from '@nestjs/common';
import { ApiConfig } from '../../../config/api.config';

/**
 * The address a plug's QR code opens: the driver app's page for that charger and plug,
 * e.g. https://charge.example.com/c/WW-7KQ4M2XR9T/1. Short on purpose: a QR code with
 * fewer characters is easier to scan from a sticker.
 */
@Injectable()
export class ChargeUrlBuilder {
  static readonly PATH = 'c';

  constructor(private readonly config: ApiConfig) {}

  forConnector(chargerIdentity: string, ocppConnectorId: number): string {
    const base = this.config.driverUrl.replace(/\/+$/, '');
    return `${base}/${ChargeUrlBuilder.PATH}/${encodeURIComponent(chargerIdentity)}/${ocppConnectorId}`;
  }
}
