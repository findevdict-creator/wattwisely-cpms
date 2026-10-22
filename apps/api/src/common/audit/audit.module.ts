import { Global, Module } from '@nestjs/common';
import { AuditRecorder } from './audit.recorder';

/** Lets every module write to the audit log. Reading it is the audit-log module's job. */
@Global()
@Module({
  providers: [AuditRecorder],
  exports: [AuditRecorder],
})
export class AuditModule {}
