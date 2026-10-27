import { Injectable } from '@nestjs/common';
import { SmtpMailSender } from '@wattwisely/mail';
import { WorkerConfig } from '../config/worker.config';

/** The worker's e-mail sender: the shared SMTP sender with the worker's settings. Tests replace it. */
@Injectable()
export class WorkerMailSender extends SmtpMailSender {
  constructor(config: WorkerConfig) {
    super(config);
  }
}
