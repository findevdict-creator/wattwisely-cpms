import { ApiProperty } from '@nestjs/swagger';
import { AccessGroupDto } from './access-group.dto';

/** GET /v1/access-groups: every group of the tenant. */
export class AccessGroupListDto {
  @ApiProperty({ type: [AccessGroupDto] }) readonly items: AccessGroupDto[];

  constructor(items: AccessGroupDto[]) {
    this.items = items;
  }
}
