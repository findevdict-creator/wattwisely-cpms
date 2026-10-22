import { Module } from '@nestjs/common';
import { RolesModule } from '../roles/roles.module';
import { InvitationMailer } from './invitation.mailer';
import { InvitationSaver } from './invitation.saver';
import { MemberAccessService } from './member-access.service';
import { MemberChangeRecorder } from './member-change.recorder';
import { MemberInvitesController } from './member-invites.controller';
import { MemberInvitesService } from './member-invites.service';
import { MembersController } from './members.controller';
import { MembersRepository } from './members.repository';
import { MembersService } from './members.service';
import { MembershipsWriter } from './memberships.writer';
import { RoleAssignmentPolicy } from './role-assignment.policy';
import { TeamTransaction } from './team.transaction';

/** Team members, invitations and role changes. Exports what accepting an invitation needs. */
@Module({
  imports: [RolesModule],
  controllers: [MembersController, MemberInvitesController],
  providers: [
    MembersRepository,
    MembershipsWriter,
    MembersService,
    MemberAccessService,
    MemberInvitesService,
    InvitationSaver,
    InvitationMailer,
    MemberChangeRecorder,
    RoleAssignmentPolicy,
    TeamTransaction,
  ],
  exports: [MembersRepository, MembershipsWriter, MemberChangeRecorder],
})
export class TeamModule {}
