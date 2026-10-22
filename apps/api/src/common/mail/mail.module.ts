import { Global, Module } from '@nestjs/common';
import { MailSender } from './mail.sender';

@Global()
@Module({
  providers: [MailSender],
  exports: [MailSender],
})
export class MailModule {}
