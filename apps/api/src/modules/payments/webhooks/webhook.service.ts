import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { TransactionRunner } from '@wattwisely/db';
import { PAYMENT_GATEWAY, PaymentGateway, WebhookInbox } from '@wattwisely/payments';
import { ProblemException } from '../../../common/problem/problem.exception';
import { PaymentErrors } from '../payment-errors';
import { WebhookReceiptDto } from './webhook-receipt.dto';

/** Hands a webhook delivery to the payments library's inbox and turns its failures into problems. */
@Injectable()
export class WebhookService {
  private readonly inbox: WebhookInbox;

  constructor(runner: TransactionRunner, @Inject(PAYMENT_GATEWAY) gateway: PaymentGateway) {
    this.inbox = new WebhookInbox(runner, gateway);
  }

  async receive(rawBody: Buffer | undefined, signature: string | undefined) {
    if (!rawBody || !signature) {
      throw new ProblemException(
        HttpStatus.BAD_REQUEST,
        'invalid_signature',
        'Send the signed event body.',
      );
    }
    try {
      return new WebhookReceiptDto(await this.inbox.receive(rawBody, signature, new Date()));
    } catch (error) {
      throw PaymentErrors.fromGateway(error);
    }
  }
}
