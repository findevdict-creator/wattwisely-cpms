import { Module } from '@nestjs/common';
import { AssetChangeRecorder } from './asset-change.recorder';
import { ChargerChangesService } from './chargers/charger-changes.service';
import { ChargerRegistrationService } from './chargers/charger-registration.service';
import { ChargerSetupCardBuilder } from './chargers/charger-setup-card.builder';
import { ChargerTransaction } from './chargers/charger-transaction';
import { ChargersController } from './chargers/chargers.controller';
import { ChargersRepository } from './chargers/chargers.repository';
import { ChargersService } from './chargers/chargers.service';
import { ConnectorsController } from './connectors/connectors.controller';
import { ConnectorsRepository } from './connectors/connectors.repository';
import { ConnectorsService } from './connectors/connectors.service';
import { SiteChangesService } from './sites/site-changes.service';
import { SitesController } from './sites/sites.controller';
import { SitesRepository } from './sites/sites.repository';
import { SitesService } from './sites/sites.service';

/**
 * Sites, chargers and connectors: what a tenant operates (stories AST-01 to AST-03).
 * One module because the three read each other's tables. Exports what other modules need
 * to check that a site exists, and what the OCPP gateway (module 4) needs to find a charger.
 */
@Module({
  controllers: [SitesController, ChargersController, ConnectorsController],
  providers: [
    AssetChangeRecorder,
    SitesRepository,
    SitesService,
    SiteChangesService,
    ChargersRepository,
    ChargersService,
    ChargerTransaction,
    ChargerSetupCardBuilder,
    ChargerRegistrationService,
    ChargerChangesService,
    ConnectorsRepository,
    ConnectorsService,
  ],
  exports: [
    SitesRepository,
    SitesService,
    ChargersRepository,
    ChargersService,
    ConnectorsRepository,
    AssetChangeRecorder,
  ],
})
export class AssetsModule {}
