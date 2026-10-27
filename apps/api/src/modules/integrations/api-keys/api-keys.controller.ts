import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { IfMatch } from '../../../common/request/if-match.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { ApiKeyChangesService } from './api-key-changes.service';
import { ApiKeysService } from './api-keys.service';
import { ApiKeyDto } from './dto/api-key.dto';
import { CreateApiKeyRequestDto } from './dto/create-api-key-request.dto';
import { CreatedApiKeyDto } from './dto/created-api-key.dto';
import { UpdateApiKeyRequestDto } from './dto/update-api-key-request.dto';

/**
 * /v1/api-keys (module 16, plan module api_keys): the keys the operator's own systems call
 * the API with. Every route needs api_keys:manage, which a key itself can never hold.
 */
@ApiTags('api-keys')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@RouteAccess.requires('api_keys:manage')
@Controller('api-keys')
export class ApiKeysController {
  constructor(
    private readonly keys: ApiKeysService,
    private readonly changes: ApiKeyChangesService,
  ) {}

  @Get()
  list(@CurrentAuth() auth: RequestAuth): Promise<ApiKeyDto[]> {
    return this.keys.list(auth.requireAccess());
  }

  @Get(':id')
  get(
    @CurrentAuth() auth: RequestAuth,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiKeyDto> {
    return this.keys.get(auth.requireAccess(), id);
  }

  @Post()
  create(
    @CurrentAuth() auth: RequestAuth,
    @Body() body: CreateApiKeyRequestDto,
  ): Promise<CreatedApiKeyDto> {
    return this.changes.create(auth, body);
  }

  @Patch(':id')
  update(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: UpdateApiKeyRequestDto,
  ): Promise<ApiKeyDto> {
    return this.changes.update(auth, id, version, body);
  }

  /** Revokes the key: it stays in the list, marked revoked, and never works again. */
  @Delete(':id')
  revoke(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
  ): Promise<ApiKeyDto> {
    return this.changes.revoke(auth, id, version);
  }
}
