import { ApiProperty } from '@nestjs/swagger';
import { AccessGroupRecord } from '../access-group-record';
import { NamedRowDto } from './named-row.dto';

/** An access group as the API returns it (story AST-04): the sites it opens and the drivers in it. */
export class AccessGroupDto {
  @ApiProperty() readonly id: string;
  @ApiProperty({ example: 'Depot staff' }) readonly name: string;
  @ApiProperty() readonly description: string;
  @ApiProperty({
    enum: ['inherit', 'pay', 'free'],
    description:
      'Whether the sessions of these drivers are paid; inherit leaves it to you, which means pay',
  })
  readonly payment_mode: string;
  @ApiProperty({
    nullable: true,
    type: Number,
    description:
      'The hold on a member’s saved card in minor units; null for your member hold amount',
  })
  readonly hold_amount: number | null;
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
    this.payment_mode = group.paymentMode;
    this.hold_amount = group.holdAmount;
    this.sites = group.sites.map((site) => new NamedRowDto(site));
    this.members = group.members.map((member) => new NamedRowDto(member));
    this.version = group.version;
    this.created_at = group.createdAt.toISOString();
    this.updated_at = group.updatedAt.toISOString();
  }
}
