import { ApiProperty } from '@nestjs/swagger';
import { AccessGroupRecord } from '../access-group-record';
import { NamedRowDto } from './named-row.dto';

/** An access group as the API returns it (story AST-04): the sites it opens and the drivers in it. */
export class AccessGroupDto {
  @ApiProperty() readonly id: string;
  @ApiProperty({ example: 'Depot staff' }) readonly name: string;
  @ApiProperty() readonly description: string;
  @ApiProperty({
    type: [NamedRowDto],
    description: 'The private sites these drivers may charge at',
  })
  readonly sites: NamedRowDto[];
  @ApiProperty({ type: [NamedRowDto] }) readonly members: NamedRowDto[];
  @ApiProperty() readonly version: number;
  @ApiProperty() readonly created_at: string;
  @ApiProperty() readonly updated_at: string;

  constructor(group: AccessGroupRecord) {
    this.id = group.id;
    this.name = group.name;
    this.description = group.description;
    this.sites = group.sites.map((site) => new NamedRowDto(site));
    this.members = group.members.map((member) => new NamedRowDto(member));
    this.version = group.version;
    this.created_at = group.createdAt.toISOString();
    this.updated_at = group.updatedAt.toISOString();
  }
}
