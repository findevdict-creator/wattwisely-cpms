import { Module } from '@nestjs/common';
import { TeamModule } from '../team/team.module';
import { InvitationTransaction } from './invitation.transaction';
import { InvitationsController } from './invitations.controller';
import { InvitationsRepository } from './invitations.repository';
import { InvitationsService } from './invitations.service';

@Module({
  imports: [TeamModule],
  controllers: [InvitationsController],
  providers: [InvitationsService, InvitationsRepository, InvitationTransaction],
})
export class InvitationsModule {}
