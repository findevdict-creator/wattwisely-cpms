import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { PaymentsModule } from '../payments/payments.module';
import { ChargeStopController } from './charges/charge-stop.controller';
import { ChargeStopService } from './charges/charge-stop.service';
import { PublicPlaceController } from './places/public-place.controller';
import { PublicPlaceService } from './places/public-place.service';
import { ChargeUrlBuilder } from './qr/charge-url.builder';
import { QrCodesController } from './qr/qr-codes.controller';
import { QrCodesService } from './qr/qr-codes.service';

/**
 * The driver's side of the platform (module 7): what a plug's QR code leads to, the
 * stickers staff print, and stopping one's own charge. Driver accounts, RFID cards and
 * saved cards come with a later module; the public charge itself is module 6's.
 */
@Module({
  imports: [AssetsModule, PaymentsModule],
  controllers: [PublicPlaceController, ChargeStopController, QrCodesController],
  providers: [PublicPlaceService, ChargeStopService, ChargeUrlBuilder, QrCodesService],
})
export class DriversModule {}
