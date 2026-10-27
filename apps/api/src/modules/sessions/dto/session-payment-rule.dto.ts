import { ApiProperty } from '@nestjs/swagger';
import { SessionPaymentRule } from '@wattwisely/db';
import { PaymentRuleText } from '@wattwisely/reports';

/** Who pays for a session and which level decided it (module 19), as the session was started. */
export class SessionPaymentRuleDto {
  @ApiProperty({ enum: ['pay', 'free'] })
  readonly outcome: string;

  @ApiProperty({ enum: ['card', 'driver', 'group', 'operator', 'staff', 'guest'] })
  readonly decided_by: string;

  @ApiProperty({ nullable: true, description: "The group's name when a group decided" })
  readonly label: string | null;

  @ApiProperty({ example: 'Free: group Depot staff' })
  readonly words: string;

  constructor(rule: SessionPaymentRule) {
    this.outcome = rule.outcome;
    this.decided_by = rule.decided_by;
    this.label = rule.label;
    this.words = PaymentRuleText.of(rule);
  }
}
