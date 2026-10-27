import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner, UuidV7 } from '@wattwisely/db';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { ApiKeyChangeErrors } from './api-key-change-errors';
import { ApiKeysRepository } from './api-keys.repository';
import { ApiKeyDto } from './dto/api-key.dto';

/** Reads a tenant's API keys (module 16): the list, oldest first, and one key. */
@Injectable()
export class ApiKeysService {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly keys: ApiKeysRepository,
  ) {}

  async list(access: TenantAccess): Promise<ApiKeyDto[]> {
    const records = await this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
      this.keys.findAll(tx),
    );
    return records.map((record) => new ApiKeyDto(record));
  }

  async get(access: TenantAccess, id: string): Promise<ApiKeyDto> {
    const record = UuidV7.isUuid(id)
      ? await this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
          this.keys.findById(tx, id),
        )
      : null;
    if (!record) {
      throw ApiKeyChangeErrors.notFound();
    }
    return new ApiKeyDto(record);
  }
}
