import { Injectable } from '@nestjs/common';
import {
  DatabaseErrors,
  DatabaseSession,
  Transaction,
  TransactionRunner,
  UuidV7,
} from '@wattwisely/db';
import { AuditRecorder } from '../../common/audit/audit.recorder';
import { PlatformTransaction } from '../../common/platform/platform-transaction';
import { VersionConflict } from '../../common/problem/version-conflict';
import { RequestAuth } from '../../common/request/request-auth';
import { CatalogErrors } from './catalog-errors';
import { CreatePlanRequestDto } from './dto/create-plan-request.dto';
import { PlanDto } from './dto/plan.dto';
import { UpdatePlanRequestDto } from './dto/update-plan-request.dto';
import { PlanColumns } from './plan-columns';
import { PlanRecord } from './plan-record';
import { PlansRepository } from './plans.repository';

/** A plan before and after a change, for the audit log. */
interface PlanChange {
  action: string;
  before: PlanRecord | null;
  after: PlanRecord;
}

/**
 * The plan catalogue (story ADM-03): what Wattwisely sells. Plans are never deleted;
 * an inactive plan keeps its tenants and disappears from the list of plans to choose.
 */
@Injectable()
export class PlansService {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly platform: PlatformTransaction,
    private readonly plans: PlansRepository,
    private readonly audit: AuditRecorder,
  ) {}

  /** Every plan with how many tenants are on it, for the admin console. */
  async list(auth: RequestAuth): Promise<PlanDto[]> {
    return this.platform.run(auth, async (tx) => {
      const counts = await this.plans.countTenants(tx);
      const records = await this.plans.findAll(tx, false);
      return records.map((record) => new PlanDto(record, counts.get(record.id) ?? 0));
    });
  }

  /** The plans a tenant can be put on, readable by anyone logged in. */
  async listActive(): Promise<PlanDto[]> {
    const records = await this.runner.run(DatabaseSession.anonymous(), (tx) =>
      this.plans.findAll(tx, true),
    );
    return records.map((record) => new PlanDto(record));
  }

  async get(auth: RequestAuth, id: string): Promise<PlanDto> {
    return this.platform.run(auth, async (tx) => {
      const counts = await this.plans.countTenants(tx);
      const record = await this.require(tx, id);
      return new PlanDto(record, counts.get(record.id) ?? 0);
    });
  }

  async create(auth: RequestAuth, body: CreatePlanRequestDto): Promise<PlanDto> {
    const id = UuidV7.create();
    const columns = PlanColumns.of(body);
    try {
      return await this.platform.run(auth, async (tx) => {
        await this.plans.insert(tx, { ...columns, id, code: body.code, name: body.name });
        const record = await this.require(tx, id);
        await this.record(tx, auth, { action: 'plan_created', before: null, after: record });
        return new PlanDto(record, 0);
      });
    } catch (error) {
      if (DatabaseErrors.violatedUniqueConstraint(error) === 'plans_code_unique') {
        throw CatalogErrors.planCodeTaken(body.code);
      }
      throw error;
    }
  }

  async update(
    auth: RequestAuth,
    id: string,
    version: number,
    body: UpdatePlanRequestDto,
  ): Promise<PlanDto> {
    const columns = PlanColumns.of(body);
    return this.platform.run(auth, async (tx) => {
      const before = await this.require(tx, id);
      if (!(await this.plans.update(tx, id, version, columns))) {
        throw VersionConflict.exception();
      }
      const after = await this.require(tx, id);
      await this.record(tx, auth, { action: 'plan_changed', before, after });
      const counts = await this.plans.countTenants(tx);
      return new PlanDto(after, counts.get(id) ?? 0);
    });
  }

  /** The plan, or 404. */
  async require(tx: Transaction, id: string): Promise<PlanRecord> {
    const record = UuidV7.isUuid(id) ? await this.plans.findById(tx, id) : null;
    if (!record) {
      throw CatalogErrors.planNotFound();
    }
    return record;
  }

  private record(tx: Transaction, auth: RequestAuth, change: PlanChange): Promise<void> {
    const entry = {
      action: `plans.${change.action}`,
      targetType: 'plan',
      targetId: change.after.id,
      targetLabel: change.after.code,
      before: change.before ? new PlanDto(change.before) : null,
      after: new PlanDto(change.after),
    };
    return this.audit.record(tx, auth, entry, null);
  }
}
