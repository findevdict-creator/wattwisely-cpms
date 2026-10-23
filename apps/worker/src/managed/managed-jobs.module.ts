import { Module } from '@nestjs/common';
import { ManagedServiceEndJob } from './managed-service-end.job';
import { ManagedServiceEnder } from './managed-service.ender';
import { ManagedServicesDueRepository } from './managed-services-due.repository';

/** The managed service job (module 10): agreements end on their date. */
@Module({
  providers: [ManagedServicesDueRepository, ManagedServiceEnder, ManagedServiceEndJob],
})
export class ManagedJobsModule {}
