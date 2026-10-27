import { ApiProperty } from '@nestjs/swagger';
import { AlertTypes } from '../../alert-types';
import { AlertRuleRecord } from '../alert-rule-record';

/** A saved routing rule. */
export class AlertRuleDto {
  @ApiProperty() readonly id: string;
  @ApiProperty({ enum: AlertTypes.ALL }) readonly alert_type: string;
  @ApiProperty({ nullable: true, type: String }) readonly site_id: string | null;
  @ApiProperty({ nullable: true, type: String }) readonly site_name: string | null;
  @ApiProperty({ nullable: true, type: String }) readonly role_id: string | null;
  @ApiProperty({ nullable: true, type: String }) readonly role_name: string | null;
  @ApiProperty({ nullable: true, type: String }) readonly membership_id: string | null;
  @ApiProperty({ nullable: true, type: String }) readonly member_name: string | null;
  @ApiProperty() readonly is_email: boolean;
  @ApiProperty() readonly is_in_portal: boolean;

  constructor(rule: AlertRuleRecord) {
    this.id = rule.id;
    this.alert_type = rule.alertType;
    this.site_id = rule.siteId;
    this.site_name = rule.siteName;
    this.role_id = rule.roleId;
    this.role_name = rule.roleName;
    this.membership_id = rule.membershipId;
    this.member_name = rule.memberName;
    this.is_email = rule.isEmail;
    this.is_in_portal = rule.isInPortal;
  }
}
