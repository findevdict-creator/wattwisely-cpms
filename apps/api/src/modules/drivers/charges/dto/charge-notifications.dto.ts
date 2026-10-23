import { ApiProperty } from '@nestjs/swagger';
import { ChargeSubscription } from '../charge-subscriptions.repository';

/**
 * The e-mails a driver gets about this charge (story NTF-01). The receipt always goes
 * once an address is given; the other four can each be turned off.
 */
export class ChargeNotificationsDto {
  /** Before the driver gives an address: every update on. */
  static readonly NONE: ChargeSubscription = {
    email: '',
    wantsStarted: true,
    wantsNearlyFull: true,
    wantsFinished: true,
    wantsIdleWarning: true,
    isUndeliverable: false,
  };

  @ApiProperty({ nullable: true, type: String }) readonly email: string | null;
  @ApiProperty() readonly started: boolean;
  @ApiProperty({ description: 'At 80% if the car reports its charge' })
  readonly nearly_full: boolean;
  @ApiProperty() readonly finished: boolean;
  @ApiProperty({ description: '5 minutes before the idle fee starts' })
  readonly idle_warning: boolean;
  @ApiProperty({ description: 'The mail server refused the address' })
  readonly is_undeliverable: boolean;

  constructor(subscription: ChargeSubscription | null) {
    const saved = subscription ?? ChargeNotificationsDto.NONE;
    this.email = subscription?.email ?? null;
    this.started = saved.wantsStarted;
    this.nearly_full = saved.wantsNearlyFull;
    this.finished = saved.wantsFinished;
    this.idle_warning = saved.wantsIdleWarning;
    this.is_undeliverable = saved.isUndeliverable;
  }
}
