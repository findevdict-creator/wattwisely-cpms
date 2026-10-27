import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner, UuidV7 } from '@wattwisely/db';
import {
  WebhookEventCatalog,
  WebhookEventEnvelope,
  WebhookSecret,
  WebhookUrlPolicy,
} from '@wattwisely/webhooks';
import { ApiConfig } from '../../../config/api.config';
import { AuditRecorder } from '../../../common/audit/audit.recorder';
import { SitePermissionChecker } from '../../../common/permissions/site-permission.checker';
import { VersionConflict } from '../../../common/problem/version-conflict';
import { RequestAuth } from '../../../common/request/request-auth';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { CreateWebhookRequestDto } from './dto/create-webhook-request.dto';
import { UpdateWebhookRequestDto } from './dto/update-webhook-request.dto';
import { WebhookDeliveryDto } from './dto/webhook-delivery.dto';
import { WebhookEndpointDto } from './dto/webhook-endpoint.dto';
import { WebhookErrors } from './webhook-errors';
import { WebhookRecord } from './webhook-record';
import { WebhooksRepository } from './webhooks.repository';

/**
 * Adding, changing, removing and testing a tenant's webhook endpoints (module 16). The
 * address is checked against WebhookUrlPolicy, the event types against the catalogue, and
 * every change lands in the audit log. A test queues a `ping` delivery the worker sends like
 * any other, so the whole path is exercised, signature included.
 */
@Injectable()
export class WebhookChangesService {
  static readonly MAX_ENDPOINTS = 10;

  constructor(
    private readonly runner: TransactionRunner,
    private readonly webhooks: WebhooksRepository,
    private readonly audit: AuditRecorder,
    private readonly config: ApiConfig,
  ) {}

  async create(auth: RequestAuth, request: CreateWebhookRequestDto): Promise<WebhookEndpointDto> {
    const access = WebhookChangesService.requireManage(auth);
    const id = UuidV7.create();
    const record = await this.run(access, async (tx) => {
      if ((await this.webhooks.findAll(tx)).length >= WebhookChangesService.MAX_ENDPOINTS) {
        throw WebhookErrors.tooMany(WebhookChangesService.MAX_ENDPOINTS);
      }
      await this.webhooks.insert(tx, {
        id,
        tenantId: access.tenant.id,
        url: this.checkedUrl(request.url),
        description: request.description?.trim() ?? '',
        secret: WebhookSecret.generate(),
        eventTypes: WebhookChangesService.checkedEvents(request.event_types),
        createdBy: auth.requireAccount().id,
      });
      const after = await this.webhooks.require(tx, id);
      await this.record(tx, auth, 'webhooks.created', { before: null, after });
      return after;
    });
    return new WebhookEndpointDto(record);
  }

  async update(
    auth: RequestAuth,
    id: string,
    version: number,
    request: UpdateWebhookRequestDto,
  ): Promise<WebhookEndpointDto> {
    const access = WebhookChangesService.requireManage(auth);
    const changes = {
      url: request.url === undefined ? undefined : this.checkedUrl(request.url),
      description: request.description?.trim(),
      eventTypes: request.event_types && WebhookChangesService.checkedEvents(request.event_types),
      isActive: request.is_active,
    };
    const record = await this.run(access, async (tx) => {
      const before = await this.webhooks.require(tx, id);
      if (!(await this.webhooks.update(tx, id, version, changes))) {
        throw VersionConflict.exception();
      }
      const after = await this.webhooks.require(tx, id);
      await this.record(tx, auth, 'webhooks.updated', { before, after });
      return after;
    });
    return new WebhookEndpointDto(record);
  }

  async remove(auth: RequestAuth, id: string, version: number): Promise<void> {
    const access = WebhookChangesService.requireManage(auth);
    await this.run(access, async (tx) => {
      const before = await this.webhooks.require(tx, id);
      if (before.version !== version) {
        throw VersionConflict.exception();
      }
      await this.webhooks.remove(tx, id);
      await this.record(tx, auth, 'webhooks.deleted', { before, after: null });
    });
  }

  /** Queues a ping for the worker to send; answers the delivery, pending. */
  async test(auth: RequestAuth, id: string): Promise<WebhookDeliveryDto> {
    const access = WebhookChangesService.requireManage(auth);
    const deliveryId = UuidV7.create();
    const payload = WebhookEventEnvelope.build({
      id: deliveryId,
      type: WebhookEventCatalog.PING,
      tenantId: access.tenant.id,
      occurredAt: new Date(),
      data: { endpoint_id: id, message: 'Hello from Wattwisely. Your endpoint is reachable.' },
    });
    const [delivery] = await this.run(access, async (tx) => {
      await this.webhooks.require(tx, id);
      await this.webhooks.insertDelivery(tx, {
        id: deliveryId,
        tenantId: access.tenant.id,
        endpointId: id,
        eventType: WebhookEventCatalog.PING,
        eventId: deliveryId,
        payload,
      });
      return this.webhooks.findDeliveries(tx, id, 1);
    });
    return new WebhookDeliveryDto(delivery);
  }

  private checkedUrl(url: string): string {
    const trimmed = url.trim();
    const problem = WebhookUrlPolicy.problemOf(trimmed, this.config.isWebhookPrivateUrlAllowed);
    if (problem) {
      throw WebhookErrors.urlRefused(problem);
    }
    return trimmed;
  }

  private static checkedEvents(keys: string[]): string[] {
    const [unknown] = WebhookEventCatalog.unknown(keys);
    if (unknown !== undefined) {
      throw WebhookErrors.eventUnknown(unknown);
    }
    return WebhookEventCatalog.normalise(keys);
  }

  private static requireManage(auth: RequestAuth): TenantAccess {
    const access = auth.requireAccess();
    SitePermissionChecker.requireWholeTenant(access, 'api_keys:manage');
    return access;
  }

  private run<T>(access: TenantAccess, work: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), work);
  }

  private record(
    tx: Transaction,
    auth: RequestAuth,
    action: string,
    change: { before: WebhookRecord | null; after: WebhookRecord | null },
  ): Promise<void> {
    const endpoint = (change.after ?? change.before) as WebhookRecord;
    const snapshot = (record: WebhookRecord | null) =>
      record && {
        url: record.url,
        description: record.description,
        event_types: record.eventTypes,
        is_active: record.isActive,
      };
    return this.audit.record(tx, auth, {
      action,
      targetType: 'webhook',
      targetId: endpoint.id,
      targetLabel: endpoint.url,
      before: snapshot(change.before),
      after: snapshot(change.after),
    });
  }
}
