import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { IfMatch } from '../../../common/request/if-match.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { CreateWebhookRequestDto } from './dto/create-webhook-request.dto';
import { ListDeliveriesQueryDto } from './dto/list-deliveries-query.dto';
import { UpdateWebhookRequestDto } from './dto/update-webhook-request.dto';
import { WebhookDeliveryDto } from './dto/webhook-delivery.dto';
import { WebhookEndpointDto } from './dto/webhook-endpoint.dto';
import { WebhookEventTypeDto } from './dto/webhook-event-type.dto';
import { WebhookChangesService } from './webhook-changes.service';
import { WebhooksService } from './webhooks.service';

/** /v1/webhooks (module 16, plan module api_keys): where a tenant's systems hear about events. */
@ApiTags('webhooks')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@RouteAccess.requires('api_keys:manage')
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooks: WebhooksService,
    private readonly changes: WebhookChangesService,
  ) {}

  @Get()
  list(@CurrentAuth() auth: RequestAuth): Promise<WebhookEndpointDto[]> {
    return this.webhooks.list(auth.requireAccess());
  }

  @Get('event-types')
  eventTypes(): WebhookEventTypeDto[] {
    return this.webhooks.eventTypes();
  }

  @Get(':id')
  get(
    @CurrentAuth() auth: RequestAuth,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<WebhookEndpointDto> {
    return this.webhooks.get(auth.requireAccess(), id);
  }

  @Get(':id/deliveries')
  deliveries(
    @CurrentAuth() auth: RequestAuth,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: ListDeliveriesQueryDto,
  ): Promise<WebhookDeliveryDto[]> {
    return this.webhooks.deliveries(auth.requireAccess(), id, query.limit);
  }

  @Post()
  create(
    @CurrentAuth() auth: RequestAuth,
    @Body() body: CreateWebhookRequestDto,
  ): Promise<WebhookEndpointDto> {
    return this.changes.create(auth, body);
  }

  @Patch(':id')
  update(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: UpdateWebhookRequestDto,
  ): Promise<WebhookEndpointDto> {
    return this.changes.update(auth, id, version, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
  ): Promise<void> {
    return this.changes.remove(auth, id, version);
  }

  /** Queues a `ping` the worker sends within its interval; watch it under deliveries. */
  @Post(':id/test')
  @HttpCode(HttpStatus.ACCEPTED)
  test(
    @CurrentAuth() auth: RequestAuth,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<WebhookDeliveryDto> {
    return this.changes.test(auth, id);
  }
}
