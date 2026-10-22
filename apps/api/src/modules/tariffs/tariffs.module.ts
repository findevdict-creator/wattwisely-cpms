import { Module } from '@nestjs/common';
import { TariffChangesService } from './tariff-changes.service';
import { TariffPreviewService } from './tariff-preview.service';
import { TariffsController } from './tariffs.controller';
import { TariffsRepository } from './tariffs.repository';
import { TariffsService } from './tariffs.service';

/**
 * Tariffs and their price versions (module 5). Exports TariffsService so a site can
 * check that the tariff it is given exists and is active.
 */
@Module({
  controllers: [TariffsController],
  providers: [TariffsRepository, TariffsService, TariffChangesService, TariffPreviewService],
  exports: [TariffsService],
})
export class TariffsModule {}
