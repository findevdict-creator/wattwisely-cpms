import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { PlatformTransaction } from '../../../common/platform/platform-transaction';
import { RequestAuth } from '../../../common/request/request-auth';
import { ServiceReportDto } from '../dto/service-report.dto';
import { ManagedServiceErrors } from '../managed-service-errors';
import { ManagedServicesRepository } from '../managed-services.repository';
import { ReportMonth } from './report-month';
import { ServiceReportRepository } from './service-report.repository';

/**
 * The monthly service report (story MGT-04): the tenant reads its own, the admin console
 * reads any tenant's. Only a tenant with an agreement (past or present) has one.
 */
@Injectable()
export class ServiceReportService {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly platform: PlatformTransaction,
    private readonly services: ManagedServicesRepository,
    private readonly reports: ServiceReportRepository,
  ) {}

  forTenant(auth: RequestAuth, monthText: string | undefined): Promise<ServiceReportDto> {
    const tenantId = auth.requireAccess().tenant.id;
    const session = DatabaseSession.forTenant(tenantId, auth.requireAccount().id);
    return this.runner.run(session, (tx) => this.build(tx, tenantId, monthText));
  }

  forStaff(auth: RequestAuth, tenantId: string, monthText: string | undefined) {
    return this.platform.runInTenant(auth, tenantId, (tx) => this.build(tx, tenantId, monthText));
  }

  private async build(tx: Transaction, tenantId: string, monthText: string | undefined) {
    const month = ReportMonth.parse(monthText);
    const history = await this.services.findHistory(tx, tenantId);
    if (history.length === 0) {
      throw ManagedServiceErrors.notFound();
    }
    return new ServiceReportDto(month, await this.reports.gather(tx, tenantId, month));
  }
}
