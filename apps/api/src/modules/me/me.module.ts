import { Module } from '@nestjs/common';
import { ManagedModule } from '../managed/managed.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { MyPermissionsController } from './my-permissions.controller';

@Module({
  imports: [ManagedModule],
  controllers: [MeController, MyPermissionsController],
  providers: [MeService],
})
export class MeModule {}
