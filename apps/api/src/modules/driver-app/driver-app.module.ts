import { Module } from '@nestjs/common';
import { DriversModule } from '../drivers/drivers.module';
import { PaymentsModule } from '../payments/payments.module';
import { DriverChargeStarter } from './charges/driver-charge-starter';
import { DriverChargeTransaction } from './charges/driver-charge.transaction';
import { DriverChargesController } from './charges/driver-charges.controller';
import { DriverChargesRepository } from './charges/driver-charges.repository';
import { DriverChargesService } from './charges/driver-charges.service';
import { GuestRecordWriter } from './charges/guest-record.writer';
import { DriverLinkWriter } from './driver-link.writer';
import { DriverInvitationTransaction } from './invitations/driver-invitation.transaction';
import { DriverInvitationsController } from './invitations/driver-invitations.controller';
import { DriverInvitationsService } from './invitations/driver-invitations.service';
import { DriverMeController } from './me/driver-me.controller';
import { DriverAccountEraser } from './me/driver-account.eraser';
import { DriverDataExportService } from './me/driver-data-export.service';
import { DriverMeService } from './me/driver-me.service';
import { SavedCardsEraser } from './me/saved-cards.eraser';
import { ChargeMailSubscriber } from './notifications/charge-mail.subscriber';
import { DriverDevicesRepository } from './notifications/driver-devices.repository';
import { DriverNotificationsController } from './notifications/driver-notifications.controller';
import { DriverNotificationsService } from './notifications/driver-notifications.service';
import { DriverOperatorsController } from './operators/driver-operators.controller';
import { DriverOperatorsService } from './operators/driver-operators.service';
import { OperatorLinkTransaction } from './operators/operator-link.transaction';
import { OperatorLinksRepository } from './operators/operator-links.repository';
import { OperatorProfileReader } from './operators/operator-profile.reader';
import { DriverPaymentMethodsController } from './payment-methods/payment-methods.controller';
import { DriverPaymentMethodsService } from './payment-methods/payment-methods.service';
import { DriverPlaceAccessResolver } from './places/driver-place-access.resolver';
import { DriverPlacesController } from './places/driver-places.controller';
import { DriverPlacesService } from './places/driver-places.service';
import { DriverReceiptsController } from './receipts/driver-receipts.controller';
import { DriverReceiptsService } from './receipts/driver-receipts.service';

/**
 * The driver app's own routes under /v1/driver (module 19): who the driver is, the operators
 * they are linked with, the invitations that make those links, the cards they save, the
 * charges they start and follow with their login, and their notifications (module 34). Every route takes the driver app's tokens
 * only; the operator's side of the same records is DriversModule, and the anonymous QR page
 * is PaymentsModule's.
 */
@Module({
  imports: [DriversModule, PaymentsModule],
  controllers: [
    DriverMeController,
    DriverOperatorsController,
    DriverInvitationsController,
    DriverPaymentMethodsController,
    DriverPlacesController,
    DriverChargesController,
    DriverReceiptsController,
    DriverNotificationsController,
  ],
  providers: [
    DriverLinkWriter,
    DriverMeService,
    OperatorProfileReader,
    OperatorLinksRepository,
    OperatorLinkTransaction,
    DriverOperatorsService,
    DriverInvitationTransaction,
    DriverInvitationsService,
    DriverPaymentMethodsService,
    DriverPlaceAccessResolver,
    DriverPlacesService,
    GuestRecordWriter,
    DriverChargeStarter,
    DriverChargesRepository,
    DriverChargeTransaction,
    DriverChargesService,
    DriverReceiptsService,
    DriverAccountEraser,
    SavedCardsEraser,
    DriverDataExportService,
    DriverDevicesRepository,
    DriverNotificationsService,
    ChargeMailSubscriber,
  ],
})
export class DriverAppModule {}
