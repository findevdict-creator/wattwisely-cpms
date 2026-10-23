import { ApiProperty } from '@nestjs/swagger';
import { AlertRuleDto } from './alert-rule.dto';
import { DefaultAlertRuleDto } from './default-alert-rule.dto';

/** GET /v1/alert-rules: the tenant's routing, and the defaults for types without rules. */
export class AlertRulesDto {
  @ApiProperty({ type: [AlertRuleDto] })
  readonly rules: AlertRuleDto[];

  @ApiProperty({ type: [DefaultAlertRuleDto] })
  readonly default_rules: DefaultAlertRuleDto[] = DefaultAlertRuleDto.ALL;

  constructor(rules: AlertRuleDto[]) {
    this.rules = rules;
  }
}
