import { Global, Module } from '@nestjs/common';
import { BrandReader } from './brand.reader';
import { WorkerMailSender } from './worker-mail.sender';

/** E-mail for the worker's jobs: the SMTP sender and the tenant's brand around every message. */
@Global()
@Module({
  providers: [WorkerMailSender, BrandReader],
  exports: [WorkerMailSender, BrandReader],
})
export class MailModule {}
