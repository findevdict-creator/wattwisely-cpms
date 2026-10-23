import { ApiProperty } from '@nestjs/swagger';

/** Who gets an alert type the tenant set no rules for. */
export class DefaultAlertRuleDto {
  static readonly ALL = [
    new DefaultAlertRuleDto('Owner', true, true),
    new DefaultAlertRuleDto('Operations', true, true),
    new DefaultAlertRuleDto('Managed operator', true, true),
    new DefaultAlertRuleDto('Technician', false, true),
  ];

  @ApiProperty() readonly role_name: string;
  @ApiProperty() readonly is_email: boolean;
  @ApiProperty() readonly is_in_portal: boolean;

  constructor(roleName: string, isEmail: boolean, isInPortal: boolean) {
    this.role_name = roleName;
    this.is_email = isEmail;
    this.is_in_portal = isInPortal;
  }
}
