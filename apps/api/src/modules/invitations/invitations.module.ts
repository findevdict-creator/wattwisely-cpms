import { Module } from '@nestjs/common';
import { TeamModule } from '../team/team.module';
import { InvitationAcceptor } from './invitation.acceptor';
import { InvitationTransaction } from './invitation.transaction';
import { InvitationsController } from './invitations.controller';
import { InvitationsRepository } from './invitations.repository';
import { InvitationsService } from './invitations.service';
import { PendingInvitationTransaction } from './pending-invitation.transaction';
import { PendingInvitationsReader } from './pending-invitations.reader';

@Module({
  imports: [TeamModule],
  controllers: [InvitationsController],
  providers: [
    InvitationsService,
    InvitationsRepository,
    InvitationTransaction,
    PendingInvitationTransaction,
    InvitationAcceptor,
    PendingInvitationsReader,
  ],
  exports: [InvitationsService, PendingInvitationsReader],
})
export class InvitationsModule {}
