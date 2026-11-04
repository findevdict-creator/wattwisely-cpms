import { Module } from '@nestjs/common';
import { InvitationsModule } from '../invitations/invitations.module';
import { ManagedModule } from '../managed/managed.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { MyInvitationsController } from './my-invitations.controller';
import { MyPermissionsController } from './my-permissions.controller';
import { MyTenantsReader } from './my-tenants.reader';

@Module({
  imports: [ManagedModule, InvitationsModule],
  controllers: [MeController, MyPermissionsController, MyInvitationsController],
  providers: [MeService, MyTenantsReader],
})
export class MeModule {}
