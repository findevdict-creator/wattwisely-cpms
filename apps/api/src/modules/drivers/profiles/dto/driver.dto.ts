import { ApiProperty } from '@nestjs/swagger';
import { DriverSummary } from '../driver-record';
import { DriverAccountLinkDto } from './driver-account-link.dto';
import { DriverGroupDto } from './driver-group.dto';

/** A driver as GET /v1/drivers lists them (story DRV-01). */
export class DriverDto {
  @ApiProperty() readonly id: string;
  @ApiProperty({ example: 'Dana Driver' }) readonly name: string;
  @ApiProperty({ nullable: true, type: String, description: 'Null without drivers:read_personal' })
  readonly email: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Null without drivers:read_personal' })
  readonly phone: string | null;
  @ApiProperty({ description: 'Your own id for the driver: an employee number, a plate' })
  readonly reference: string;
  @ApiProperty() readonly notes: string;
  @ApiProperty({ enum: ['active', 'blocked'] }) readonly status: string;
  @ApiProperty({
    enum: ['inherit', 'pay', 'free'],
    description: 'Whether this driver’s sessions are paid; inherit asks their groups, then the operator (pay)',
  })
  readonly payment_mode: string;
  @ApiProperty({ type: DriverAccountLinkDto, description: 'The driver’s own login, or the invitation to one' })
  readonly account: DriverAccountLinkDto;
  @ApiProperty({ nullable: true, type: String }) readonly blocked_at: string | null;
  @ApiProperty({ nullable: true, type: String }) readonly blocked_by: string | null;
  @ApiProperty() readonly block_reason: string;
  @ApiProperty() readonly card_count: number;
  @ApiProperty() readonly active_card_count: number;
  @ApiProperty({ nullable: true, type: String }) readonly last_session_at: string | null;
  @ApiProperty({ type: [DriverGroupDto] }) readonly groups: DriverGroupDto[];
  @ApiProperty({ description: 'True when e-mail and phone were left out for lack of permission' })
  readonly is_personal_data_hidden: boolean;
  @ApiProperty() readonly version: number;
  @ApiProperty() readonly created_at: string;
  @ApiProperty() readonly updated_at: string;

  constructor(driver: DriverSummary & { isHidden: boolean }) {
    this.id = driver.id;
    this.name = driver.name;
    this.email = driver.email;
    this.phone = driver.phone;
    this.reference = driver.reference;
    this.notes = driver.notes;
    this.status = driver.status;
    this.payment_mode = driver.paymentMode;
    this.account = new DriverAccountLinkDto(driver);
    this.blocked_at = driver.blockedAt?.toISOString() ?? null;
    this.blocked_by = driver.blockedByName;
    this.block_reason = driver.blockReason;
    this.card_count = driver.cardCount;
    this.active_card_count = driver.activeCardCount;
    this.last_session_at = driver.lastSessionAt?.toISOString() ?? null;
    this.groups = driver.groups.map((group) => new DriverGroupDto(group));
    this.is_personal_data_hidden = driver.isHidden;
    this.version = driver.version;
    this.created_at = driver.createdAt.toISOString();
    this.updated_at = driver.updatedAt.toISOString();
  }
}
