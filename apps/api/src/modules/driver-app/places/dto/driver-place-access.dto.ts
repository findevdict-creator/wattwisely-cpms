import { ApiProperty } from '@nestjs/swagger';
import {
  DriverChargeRefusal,
  DriverPlaceAccess,
  DriverPlaceAccessPolicy,
} from '../driver-place-access';
import { DriverPlaceCardDto } from './driver-place-card.dto';
import { DriverPlacePaymentDto } from './driver-place-payment.dto';

/** What stands between the logged-in driver and this plug (module 19). */
export class DriverPlaceAccessDto {
  @ApiProperty() readonly tenant_id: string;
  @ApiProperty({ description: 'The operator keeps a record of this login' })
  readonly is_linked: boolean;
  @ApiProperty({ description: 'That record was made at a first charge, with consent' })
  readonly is_guest_record: boolean;
  @ApiProperty() readonly is_blocked: boolean;
  @ApiProperty() readonly is_private_site: boolean;
  @ApiProperty({ description: 'One of the driver’s groups names this site' })
  readonly is_member: boolean;
  @ApiProperty({
    description:
      'The operator has no record of this login yet: starting needs the driver’s consent to make one',
  })
  readonly needs_consent: boolean;
  @ApiProperty({ type: DriverPlacePaymentDto }) readonly payment: DriverPlacePaymentDto;
  @ApiProperty({ type: DriverPlaceCardDto, nullable: true })
  readonly card: DriverPlaceCardDto | null;
  @ApiProperty() readonly can_charge: boolean;
  @ApiProperty({
    nullable: true,
    enum: [
      'driver_blocked',
      'private_site',
      'plug_unavailable',
      'no_tariff',
      'payments_not_accepted',
      'no_payment_method',
    ],
  })
  readonly reason: DriverChargeRefusal | null;
  @ApiProperty({ nullable: true, description: 'The reason, in words for the driver' })
  readonly reason_words: string | null;

  constructor(access: DriverPlaceAccess, refusal: DriverChargeRefusal | null) {
    this.tenant_id = access.tenantId;
    this.is_linked = access.driver !== null;
    this.is_guest_record = access.driver?.isGuest ?? false;
    this.is_blocked = access.driver?.status === 'blocked';
    this.is_private_site = access.visibility === 'private';
    this.is_member = access.isMemberAtSite;
    this.needs_consent = access.driver === null;
    this.payment = new DriverPlacePaymentDto(access.rule);
    this.card = access.card ? new DriverPlaceCardDto(access.card.card) : null;
    this.can_charge = refusal === null;
    this.reason = refusal;
    this.reason_words = refusal ? DriverPlaceAccessPolicy.WORDS[refusal] : null;
  }
}
