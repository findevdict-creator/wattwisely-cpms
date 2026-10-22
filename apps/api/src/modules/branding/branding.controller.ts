import { Body, Controller, Delete, Get, Patch, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../common/request/current-auth.decorator';
import { IfMatch } from '../../common/request/if-match.decorator';
import { RequestAuth } from '../../common/request/request-auth';
import { BrandingService } from './branding.service';
import { BrandingDto } from './dto/branding.dto';
import { UpdateBrandingRequestDto } from './dto/update-branding-request.dto';
import { UploadLogoRequestDto } from './dto/upload-logo-request.dto';
import { LogoService } from './logo.service';

/** /v1/branding: how the company looks to drivers (white-labelling design, "Branded" level). */
@ApiTags('settings')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller('branding')
export class BrandingController {
  constructor(
    private readonly branding: BrandingService,
    private readonly logos: LogoService,
  ) {}

  @Get()
  @RouteAccess.requires('settings:read')
  get(@CurrentAuth() auth: RequestAuth): Promise<BrandingDto> {
    return this.branding.get(auth.requireAccess());
  }

  @Patch()
  @RouteAccess.requires('settings:write')
  update(
    @CurrentAuth() auth: RequestAuth,
    @IfMatch() version: number,
    @Body() body: UpdateBrandingRequestDto,
  ): Promise<BrandingDto> {
    return this.branding.update(auth, version, body);
  }

  /** Replaces the logo. The answer's logo_url changes with every new file. */
  @Put('logo')
  @RouteAccess.requires('settings:write')
  uploadLogo(
    @CurrentAuth() auth: RequestAuth,
    @IfMatch() version: number,
    @Body() body: UploadLogoRequestDto,
  ): Promise<BrandingDto> {
    return this.logos.upload(auth, version, body);
  }

  @Delete('logo')
  @RouteAccess.requires('settings:write')
  removeLogo(@CurrentAuth() auth: RequestAuth, @IfMatch() version: number): Promise<BrandingDto> {
    return this.logos.remove(auth, version);
  }
}
