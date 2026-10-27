import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { BrandingModule } from '../branding/branding.module';
import { PaymentsModule } from '../payments/payments.module';
import { ChargeNotificationsController } from './charges/charge-notifications.controller';
import { ChargeNotificationsService } from './charges/charge-notifications.service';
import { ChargeStopController } from './charges/charge-stop.controller';
import { ChargeSubscriptionsRepository } from './charges/charge-subscriptions.repository';
import { ChargeStopService } from './charges/charge-stop.service';
import { PlaceDescriber } from './places/place-describer';
import { PublicPlaceController } from './places/public-place.controller';
import { PublicPlaceService } from './places/public-place.service';
import { ChargeUrlBuilder } from './qr/charge-url.builder';
import { QrCodesController } from './qr/qr-codes.controller';
import { QrCodesService } from './qr/qr-codes.service';

/**
 * The driver's side of the platform (module 7): what a plug's QR code leads to, the
 * stickers staff print, stopping one's own charge and its e-mail updates (module 11). Driver accounts, RFID cards and
 * saved cards come with a later module; the public charge itself is module 6's.
 */
@Module({
  imports: [AssetsModule, BrandingModule, PaymentsModule],
  controllers: [
    PublicPlaceController,
    ChargeStopController,
    ChargeNotificationsController,
    QrCodesController,
  ],
  providers: [
    PlaceDescriber,
    PublicPlaceService,
    ChargeStopService,
    ChargeSubscriptionsRepository,
    ChargeNotificationsService,
    ChargeUrlBuilder,
    QrCodesService,
  ],
})
export class DriversModule {}
