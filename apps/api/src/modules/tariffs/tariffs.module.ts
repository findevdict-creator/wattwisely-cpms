import { Module } from '@nestjs/common';
import { ManagedModule } from '../managed/managed.module';
import { TariffProposalDecisionsService } from './proposals/tariff-proposal-decisions.service';
import { TariffProposalsController } from './proposals/tariff-proposals.controller';
import { TariffProposalsRepository } from './proposals/tariff-proposals.repository';
import { TariffProposalStore } from './proposals/tariff-proposal.store';
import { TariffProposalsService } from './proposals/tariff-proposals.service';
import { TariffApprovalRule } from './tariff-approval.rule';
import { TariffChangesService } from './tariff-changes.service';
import { TariffPreviewService } from './tariff-preview.service';
import { TariffWriter } from './tariff.writer';
import { TariffsController } from './tariffs.controller';
import { TariffsRepository } from './tariffs.repository';
import { TariffsService } from './tariffs.service';

/**
 * Tariffs and their price versions (module 5), and the proposals a Managed operator makes
 * for the Owner to approve (module 10). Exports TariffsService so a site can check that
 * the tariff it is given exists and is active.
 */
@Module({
  imports: [ManagedModule],
  controllers: [TariffsController, TariffProposalsController],
  providers: [
    TariffsRepository,
    TariffsService,
    TariffWriter,
    TariffApprovalRule,
    TariffChangesService,
    TariffPreviewService,
    TariffProposalsRepository,
    TariffProposalStore,
    TariffProposalsService,
    TariffProposalDecisionsService,
  ],
  exports: [TariffsService],
})
export class TariffsModule {}
