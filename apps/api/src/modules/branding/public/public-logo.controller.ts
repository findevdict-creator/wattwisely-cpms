import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiProduces, ApiTags } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { PublicLogoService } from './public-logo.service';

/**
 * /v1/public/branding/{slug}/logo: the tenant's logo, for drivers' pages and e-mails.
 * The URL carries the logo's fingerprint (?v=), so browsers may keep it for a day; an SVG
 * is served under a policy that lets it draw and nothing else.
 */
@ApiTags('public')
@RouteAccess.public()
@Controller('public/branding')
export class PublicLogoController {
  static readonly CACHE_CONTROL = 'public, max-age=86400';
  static readonly SVG_POLICY = "default-src 'none'; style-src 'unsafe-inline'";

  constructor(private readonly service: PublicLogoService) {}

  @Get(':slug/logo')
  @ApiProduces('image/png', 'image/jpeg', 'image/svg+xml', 'image/webp')
  async logo(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<Buffer> {
    const logo = await this.service.find(slug);
    reply
      .header('Content-Type', logo.contentType)
      .header('Content-Length', String(logo.data.length))
      .header('Cache-Control', PublicLogoController.CACHE_CONTROL)
      .header('ETag', `"${logo.etag}"`)
      .header('Content-Disposition', 'inline')
      .header('X-Content-Type-Options', 'nosniff')
      .header('Content-Security-Policy', PublicLogoController.SVG_POLICY);
    return logo.data;
  }
}
