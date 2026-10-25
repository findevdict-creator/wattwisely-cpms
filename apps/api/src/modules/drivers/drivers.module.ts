import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { BrandingModule } from '../branding/branding.module';
import { PaymentsModule } from '../payments/payments.module';
import { DriverInvitationMailer } from './accounts/driver-invitation.mailer';
import { DriverInviteTransaction } from './accounts/driver-invite.transaction';
import { DriverInvitationsRepository } from './accounts/driver-invitations.repository';
import { DriverInvitesController } from './accounts/driver-invites.controller';
import { DriverInvitesService } from './accounts/driver-invites.service';
import { RfidCardsController } from './cards/rfid-cards.controller';
import { RfidCardsRepository } from './cards/rfid-cards.repository';
import { RfidCardsService } from './cards/rfid-cards.service';
import { ChargeNotificationsController } from './charges/charge-notifications.controller';
import { ChargeNotificationsService } from './charges/charge-notifications.service';
import { ChargeStopController } from './charges/charge-stop.controller';
import { ChargeSubscriptionsRepository } from './charges/charge-subscriptions.repository';
import { ChargeStopService } from './charges/charge-stop.service';
import { DriverStores } from './driver-stores';
import { AccessGroupsController } from './groups/access-groups.controller';
import { AccessGroupsRepository } from './groups/access-groups.repository';
import { AccessGroupsService } from './groups/access-groups.service';
import { PlaceDescriber } from './places/place-describer';
import { PublicPlaceController } from './places/public-place.controller';
import { PublicPlaceService } from './places/public-place.service';
import { DriverChangesService } from './profiles/driver-changes.service';
import { DriversController } from './profiles/drivers.controller';
import { DriversRepository } from './profiles/drivers.repository';
import { DriversService } from './profiles/drivers.service';
import { ChargeUrlBuilder } from './qr/charge-url.builder';
import { QrCodesController } from './qr/qr-codes.controller';
import { QrCodesService } from './qr/qr-codes.service';

/**
 * The driver's side of the platform: what a plug's QR code leads to, the stickers staff
 * print, stopping one's own charge and its e-mail updates (modules 7 and 11); and the
 * tenant's drivers, their RFID cards and the access groups that open private sites
 * (module 13), and the invitations that link a driver's own login to their record (module 19).
 * The driver's side of that login is DriverAppModule; the public charge itself is module 6's.
 */
@Module({
  imports: [AssetsModule, BrandingModule, PaymentsModule],
  controllers: [
    PublicPlaceController,
    ChargeStopController,
    ChargeNotificationsController,
    QrCodesController,
    DriversController,
    DriverInvitesController,
    RfidCardsController,
    AccessGroupsController,
  ],
  providers: [
    PlaceDescriber,
    PublicPlaceService,
    ChargeStopService,
    ChargeSubscriptionsRepository,
    ChargeNotificationsService,
    ChargeUrlBuilder,
    QrCodesService,
    DriversRepository,
    DriversService,
    DriverChangesService,
    RfidCardsRepository,
    RfidCardsService,
    AccessGroupsRepository,
    AccessGroupsService,
    DriverStores,
    DriverInvitationsRepository,
    DriverInvitationMailer,
    DriverInviteTransaction,
    DriverInvitesService,
  ],
  exports: [DriversRepository, AccessGroupsRepository, RfidCardsRepository, DriverInvitationsRepository],
})
export class DriversModule {}
