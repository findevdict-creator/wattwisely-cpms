import { Injectable } from '@nestjs/common';
import {
  DatabaseErrors,
  DatabaseSession,
  Transaction,
  TransactionRunner,
  UuidV7,
} from '@wattwisely/db';
import { ConnectorLabel } from '@wattwisely/ocpp-contracts';
import { SitePermissionChecker } from '../../../common/permissions/site-permission.checker';
import { VersionConflict } from '../../../common/problem/version-conflict';
import { RequestAuth } from '../../../common/request/request-auth';
import { AssetChangeRecorder } from '../asset-change.recorder';
import { AssetErrors } from '../asset-errors';
import { ChargerRecord } from '../chargers/charger-record';
import { ChargersService } from '../chargers/chargers.service';
import { ConnectorRecord } from './connector-record';
import { ConnectorsRepository } from './connectors.repository';
import { AddConnectorRequestDto } from './dto/add-connector-request.dto';
import { ConnectorDto } from './dto/connector.dto';
import { UpdateConnectorRequestDto } from './dto/update-connector-request.dto';

/**
 * Adds, edits and removes a charger's connectors (story AST-03). Changing a connector takes
 * chargers:write at the charger's site; the charger's own status reports arrive in module 4.
 */
@Injectable()
export class ConnectorsService {
  static readonly INDEX_PROBLEMS: Record<string, () => Error> = {
    connectors_ocpp_id_unique: AssetErrors.connectorNumberTaken,
    connectors_label_unique: AssetErrors.connectorLabelTaken,
  };

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly connectors: ConnectorsRepository,
    private readonly chargers: ChargersService,
    private readonly changes: AssetChangeRecorder,
  ) {}

  async list(auth: RequestAuth, chargerId: string): Promise<ConnectorDto[]> {
    const access = auth.requireAccess();
    const rows = await this.run(auth, async (tx) => {
      const charger = await this.chargers.requireVisible(tx, access, chargerId);
      return this.connectors.findByChargers(tx, [charger.id]);
    });
    return rows.map((row) => new ConnectorDto(row));
  }

  async add(
    auth: RequestAuth,
    chargerId: string,
    request: AddConnectorRequestDto,
  ): Promise<ConnectorDto> {
    const id = UuidV7.create();
    const row = await this.run(auth, async (tx) => {
      const charger = await this.requireWritable(tx, auth, chargerId);
      const existing = await this.connectors.findByChargers(tx, [charger.id]);
      await this.connectors.insert(tx, {
        id,
        tenantId: auth.requireAccess().tenant.id,
        chargerId: charger.id,
        ocppConnectorId:
          request.ocpp_connector_id ?? (await this.connectors.nextOcppConnectorId(tx, charger.id)),
        evseId: request.evse_id,
        type: ConnectorsService.typeOf(request.type),
        currentType: request.current_type,
        maxPowerKw: request.max_power_kw,
        label: request.label?.trim() || ConnectorLabel.next(existing.map((c) => c.label)),
        createdBy: auth.requireAccount().id,
        updatedBy: auth.requireAccount().id,
      });
      const after = (await this.connectors.findById(tx, id)) as ConnectorRecord;
      await this.record(tx, auth, 'chargers.connector_added', { charger, before: null, after });
      return after;
    });
    return new ConnectorDto(row);
  }

  async update(
    auth: RequestAuth,
    id: string,
    version: number,
    request: UpdateConnectorRequestDto,
  ): Promise<ConnectorDto> {
    const row = await this.run(auth, async (tx) => {
      const before = await this.requireConnector(tx, auth, id);
      const charger = await this.requireWritable(tx, auth, before.chargerId);
      const changes = {
        ...ConnectorsService.columnsOf(request),
        updatedBy: auth.requireAccount().id,
      };
      if (!(await this.connectors.update(tx, id, version, changes))) {
        throw VersionConflict.exception();
      }
      const after = (await this.connectors.findById(tx, id)) as ConnectorRecord;
      await this.record(tx, auth, 'chargers.connector_updated', { charger, before, after });
      return after;
    });
    return new ConnectorDto(row);
  }

  /** Only a connector the charger has never reported can go; the rest are the charger's to keep. */
  async remove(auth: RequestAuth, id: string, version: number): Promise<void> {
    await this.run(auth, async (tx) => {
      const before = await this.requireConnector(tx, auth, id);
      const charger = await this.requireWritable(tx, auth, before.chargerId);
      if (before.status !== 'unknown' || before.statusChangedAt) {
        throw AssetErrors.connectorReported();
      }
      if (before.version !== version) {
        throw VersionConflict.exception();
      }
      await this.connectors.delete(tx, id);
      await this.record(tx, auth, 'chargers.connector_removed', { charger, before, after: null });
    });
  }

  private async requireConnector(
    tx: Transaction,
    auth: RequestAuth,
    id: string,
  ): Promise<ConnectorRecord> {
    const record = UuidV7.isUuid(id) ? await this.connectors.findById(tx, id) : null;
    if (!record) {
      throw AssetErrors.connectorNotFound();
    }
    return record;
  }

  /** The charger, visible to the caller and with chargers:write at its site. */
  private async requireWritable(
    tx: Transaction,
    auth: RequestAuth,
    chargerId: string,
  ): Promise<ChargerRecord> {
    const access = auth.requireAccess();
    const charger = await this.chargers.requireVisible(tx, access, chargerId);
    SitePermissionChecker.requireAt(access, 'chargers:write', charger.siteId);
    return charger;
  }

  private async run<T>(auth: RequestAuth, work: (tx: Transaction) => Promise<T>): Promise<T> {
    const session = DatabaseSession.forTenant(auth.requireAccess().tenant.id);
    try {
      return await this.transactionRunner.run(session, work);
    } catch (error) {
      const problem =
        ConnectorsService.INDEX_PROBLEMS[DatabaseErrors.violatedUniqueConstraint(error) ?? ''];
      throw problem ? problem() : error;
    }
  }

  private record(
    tx: Transaction,
    auth: RequestAuth,
    action: string,
    change: {
      charger: ChargerRecord;
      before: ConnectorRecord | null;
      after: ConnectorRecord | null;
    },
  ): Promise<void> {
    const connector = (change.after ?? change.before) as ConnectorRecord;
    return this.changes.record(tx, auth, action, {
      target: {
        type: 'connector',
        id: connector.id,
        label: `${change.charger.ocppIdentity} ${connector.label}`,
      },
      before: ConnectorsService.snapshot(change.before),
      after: ConnectorsService.snapshot(change.after),
    });
  }

  private static snapshot(connector: ConnectorRecord | null): object | null {
    if (!connector) {
      return null;
    }
    return {
      ocpp_connector_id: connector.ocppConnectorId,
      evse_id: connector.evseId,
      type: connector.type,
      current_type: connector.currentType,
      max_power_kw: connector.maxPowerKw,
      label: connector.label,
    };
  }

  private static columnsOf(request: UpdateConnectorRequestDto) {
    return {
      ocppConnectorId: request.ocpp_connector_id,
      evseId: request.evse_id,
      type: request.type === undefined ? undefined : ConnectorsService.typeOf(request.type),
      currentType: request.current_type,
      maxPowerKw: request.max_power_kw,
      label: request.label?.trim(),
    };
  }

  private static typeOf(type: string | undefined): ConnectorRecord['type'] {
    return (type ?? 'unknown') as ConnectorRecord['type'];
  }
}
