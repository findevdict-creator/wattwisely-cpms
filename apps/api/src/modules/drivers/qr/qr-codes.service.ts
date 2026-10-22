import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { ChargersService } from '../../assets/chargers/chargers.service';
import { ConnectorsRepository } from '../../assets/connectors/connectors.repository';
import { ChargeUrlBuilder } from './charge-url.builder';
import { ConnectorQrCodeDto } from './dto/connector-qr-code.dto';
import { QrCodeRenderer } from './qr-code.renderer';

/** The QR codes staff print for a charger: one per plug, each opening the driver app on that plug. */
@Injectable()
export class QrCodesService {
  private readonly renderer = new QrCodeRenderer();

  constructor(
    private readonly runner: TransactionRunner,
    private readonly chargers: ChargersService,
    private readonly connectors: ConnectorsRepository,
    private readonly urls: ChargeUrlBuilder,
  ) {}

  /** In plug order; 404 when the charger lies outside the caller's chargers:read scope. */
  async list(access: TenantAccess, chargerId: string): Promise<ConnectorQrCodeDto[]> {
    const found = await this.runner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const charger = await this.chargers.requireVisible(tx, access, chargerId);
      return { charger, connectors: await this.connectors.findByChargers(tx, [charger.id]) };
    });
    return Promise.all(
      found.connectors.map(async (connector) => {
        const url = this.urls.forConnector(found.charger.ocppIdentity, connector.ocppConnectorId);
        return new ConnectorQrCodeDto(connector, url, await this.renderer.svg(url));
      }),
    );
  }
}
