import { ApiProperty } from '@nestjs/swagger';
import { SiteScope } from '../../../common/permissions/site-scope';

/** One permission I hold and where: site_ids is null for the whole tenant. */
export class GrantedPermissionDto {
  @ApiProperty({ example: 'chargers:command' })
  readonly key: string;

  @ApiProperty({ nullable: true, type: [String] })
  readonly site_ids: string[] | null;

  constructor(key: string, scope: SiteScope | null) {
    this.key = key;
    this.site_ids = scope ? scope.toSiteIds() : [];
  }
}
