import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { WebhookEventCatalog } from '@wattwisely/webhooks';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { WebhookDeliveryDto } from './dto/webhook-delivery.dto';
import { WebhookEndpointDto } from './dto/webhook-endpoint.dto';
import { WebhookEventTypeDto } from './dto/webhook-event-type.dto';
import { WebhookRecord } from './webhook-record';
import { WebhooksRepository } from './webhooks.repository';

/** Reads a tenant's webhook endpoints, their deliveries and the event catalogue (module 16). */
@Injectable()
export class WebhooksService {
  static readonly DEFAULT_DELIVERIES = 50;

  constructor(
    private readonly runner: TransactionRunner,
    private readonly webhooks: WebhooksRepository,
  ) {}

  async list(access: TenantAccess): Promise<WebhookEndpointDto[]> {
    const records = await this.run(access, (tx) => this.webhooks.findAll(tx));
    return records.map((record) => new WebhookEndpointDto(record));
  }

  async get(access: TenantAccess, id: string): Promise<WebhookEndpointDto> {
    return new WebhookEndpointDto(await this.run(access, (tx) => this.require(tx, id)));
  }

  async deliveries(
    access: TenantAccess,
    id: string,
    limit = WebhooksService.DEFAULT_DELIVERIES,
  ): Promise<WebhookDeliveryDto[]> {
    const records = await this.run(access, async (tx) => {
      await this.require(tx, id);
      return this.webhooks.findDeliveries(tx, id, limit);
    });
    return records.map((record) => new WebhookDeliveryDto(record));
  }

  eventTypes(): WebhookEventTypeDto[] {
    return WebhookEventCatalog.ENTRIES.map((entry) => new WebhookEventTypeDto(entry));
  }

  private require(tx: Transaction, id: string): Promise<WebhookRecord> {
    return this.webhooks.require(tx, id);
  }

  private run<T>(access: TenantAccess, work: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), work);
  }
}
