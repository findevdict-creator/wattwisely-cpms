import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { MyPermissionsController } from './my-permissions.controller';

@Module({
  controllers: [MeController, MyPermissionsController],
  providers: [MeService],
})
export class MeModule {}
