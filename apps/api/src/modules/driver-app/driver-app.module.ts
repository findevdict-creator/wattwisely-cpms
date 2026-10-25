import { Module } from '@nestjs/common';
import { DriversModule } from '../drivers/drivers.module';
import { DriverLinkWriter } from './driver-link.writer';
import { DriverInvitationTransaction } from './invitations/driver-invitation.transaction';
import { DriverInvitationsController } from './invitations/driver-invitations.controller';
import { DriverInvitationsService } from './invitations/driver-invitations.service';
import { DriverMeController } from './me/driver-me.controller';
import { DriverMeService } from './me/driver-me.service';
import { DriverOperatorsController } from './operators/driver-operators.controller';
import { DriverOperatorsService } from './operators/driver-operators.service';
import { OperatorLinkTransaction } from './operators/operator-link.transaction';
import { OperatorLinksRepository } from './operators/operator-links.repository';
import { OperatorProfileReader } from './operators/operator-profile.reader';

/**
 * The driver app's own routes under /v1/driver (module 19): who the driver is, the operators
 * they are linked with, and the invitations that make those links. Every route takes the
 * driver app's tokens only; the operator's side of the same records is DriversModule.
 */
@Module({
  imports: [DriversModule],
  controllers: [DriverMeController, DriverOperatorsController, DriverInvitationsController],
  providers: [
    DriverLinkWriter,
    DriverMeService,
    OperatorProfileReader,
    OperatorLinksRepository,
    OperatorLinkTransaction,
    DriverOperatorsService,
    DriverInvitationTransaction,
    DriverInvitationsService,
  ],
})
export class DriverAppModule {}
