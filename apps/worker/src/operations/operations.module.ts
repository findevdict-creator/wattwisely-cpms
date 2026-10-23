import { Module } from '@nestjs/common';
import { SessionJobsModule } from '../sessions/session-jobs.module';
import { QueueCounter } from './queue-counter';
import { QueueStatsJob } from './queue-stats.job';
import { RetentionJob } from './retention.job';
import { RetentionSweeper } from './retention.sweeper';

/** Module 12's jobs: counting the queues for the monitoring, and deleting old data. */
@Module({
  imports: [SessionJobsModule],
  providers: [QueueCounter, QueueStatsJob, RetentionSweeper, RetentionJob],
})
export class OperationsModule {}
