import { ApiProperty } from '@nestjs/swagger';
import { ResolvedPaymentRule } from '@wattwisely/payments';
import { PaymentRuleText } from '@wattwisely/reports';

/** Who pays at this plug, as resolved for the logged-in driver, and what would be held. */
export class DriverPlacePaymentDto {
  @ApiProperty({ enum: ['pay', 'free'] }) readonly outcome: string;
  @ApiProperty({ enum: ['card', 'driver', 'group', 'operator', 'staff', 'guest'] })
  readonly decided_by: string;
  @ApiProperty({ nullable: true }) readonly label: string | null;
  @ApiProperty({ example: 'Free: group Depot staff' }) readonly words: string;
  @ApiProperty({
    nullable: true,
    description: 'Held on the saved card at the start, in minor units',
  })
  readonly hold_amount: number | null;

  constructor(rule: ResolvedPaymentRule) {
    this.outcome = rule.outcome;
    this.decided_by = rule.decided_by;
    this.label = rule.label;
    this.words = PaymentRuleText.of(rule);
    this.hold_amount = rule.holdAmount;
  }
}
