import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { AlertType, AlertTypes } from '../../alert-types';

/** One routing rule to save: an alert type, a site or all of them, a role or a person, the channels. */
export class AlertRuleRequestDto {
  @ApiProperty({ enum: AlertTypes.ALL })
  @IsIn(AlertTypes.ALL)
  readonly alert_type!: AlertType;

  @ApiProperty({ required: false, nullable: true, description: 'Empty for every site' })
  @IsOptional()
  @IsUUID('all')
  readonly site_id?: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'Everyone holding this role' })
  @IsOptional()
  @IsUUID('all')
  readonly role_id?: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'Or this one member' })
  @IsOptional()
  @IsUUID('all')
  readonly membership_id?: string | null;

  @ApiProperty()
  @IsBoolean()
  readonly is_email!: boolean;

  @ApiProperty()
  @IsBoolean()
  readonly is_in_portal!: boolean;
}
