import { ApiProperty } from '@nestjs/swagger';
import { OperatorProfileRecord } from '../operator-link-record';
import { DriverOperatorCardDto } from './driver-operator-card.dto';
import { DriverOperatorDto } from './driver-operator.dto';

/** GET /v1/driver/operators/{tenant_id}/profile: what the operator holds about the driver (the consent screen). */
export class DriverOperatorProfileDto extends DriverOperatorDto {
  @ApiProperty({ nullable: true, type: String }) readonly email: string | null;
  @ApiProperty({ nullable: true, type: String }) readonly phone: string | null;
  @ApiProperty({ type: [String], description: 'The access groups the operator put you in' })
  readonly groups: string[];
  @ApiProperty({ type: [DriverOperatorCardDto] }) readonly cards: DriverOperatorCardDto[];

  constructor(profile: OperatorProfileRecord) {
    super(profile);
    this.email = profile.email;
    this.phone = profile.phone;
    this.groups = profile.groups;
    this.cards = profile.cards.map((card) => new DriverOperatorCardDto(card));
  }
}
