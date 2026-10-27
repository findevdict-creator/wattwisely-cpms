import { Module } from '@nestjs/common';
import { LoadManagementChangesService } from './load-management-changes.service';
import { LoadManagementController } from './load-management.controller';
import { LoadManagementRepository } from './load-management.repository';
import { LoadManagementService } from './load-management.service';

/** The load management add-on's settings (module 17); the worker does the balancing. */
@Module({
  controllers: [LoadManagementController],
  providers: [LoadManagementRepository, LoadManagementService, LoadManagementChangesService],
})
export class LoadManagementModule {}
