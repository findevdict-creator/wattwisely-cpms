import { ApiProperty } from '@nestjs/swagger';
import { TenantBrand } from '@wattwisely/mail';
import { SiteAddressDto } from '../../../assets/sites/dto/site-address.dto';
import { ChargerRecord } from '../../../assets/chargers/charger-record';
import { PublicBrandingDto } from '../../../branding/dto/public-branding.dto';
import { PublicConnector } from '../../../payments/public/charge-place.lookup';
import { PlaceAvailability } from '../place-availability';
import { PlaceSite } from '../place-site.lookup';
import { PublicTariffDto } from './public-tariff.dto';

/** Everything the service found out about the plug a QR code names. */
export interface PublicPlaceView {
  site: PlaceSite;
  charger: ChargerRecord;
  connector: PublicConnector;
  availability: PlaceAvailability;
  isCardPaymentAccepted: boolean;
  holdAmount: number | null;
  tariff: PublicTariffDto | null;
  brand: TenantBrand;
}

/**
 * A plug as the driver's QR page introduces it before any payment: who runs it, where it
 * is, whether it can be used now, and what charging costs. Public: the QR code on the
 * charger names the charger and the plug, nothing more.
 */
export class PublicPlaceDto {
  @ApiProperty({ example: 'Acme Charging' })
  readonly operator_name: string;

  @ApiProperty({ example: 'Riverside' })
  readonly site_name: string;

  @ApiProperty({ type: SiteAddressDto })
  readonly address: SiteAddressDto;

  @ApiProperty({ example: 'Europe/London' })
  readonly time_zone: string;

  @ApiProperty({ example: 'CP-RIVER-1' })
  readonly charger_identity: string;

  @ApiProperty({ example: 1 })
  readonly ocpp_connector_id: number;

  @ApiProperty({ example: 'A' })
  readonly connector_label: string;

  @ApiProperty({ enum: ['ccs1', 'ccs2', 'type1', 'type2', 'chademo', 'gbt', 'nacs', 'unknown'] })
  readonly connector_type: string;

  @ApiProperty({ enum: ['ac', 'dc'], nullable: true })
  readonly current_type: string | null;

  @ApiProperty({ nullable: true })
  readonly max_power_kw: number | null;

  @ApiProperty({ description: 'The last status the charger reported for the plug' })
  readonly connector_status: string;

  @ApiProperty()
  readonly is_charger_online: boolean;

  @ApiProperty({ enum: ['available', 'busy', 'offline', 'out_of_service', 'faulted'] })
  readonly availability: string;

  @ApiProperty({ description: 'The company takes card payments here and has prices' })
  readonly is_card_payment_accepted: boolean;

  @ApiProperty({ nullable: true, description: 'Held on the card at the start, in minor units' })
  readonly hold_amount: number | null;

  @ApiProperty({ type: PublicTariffDto, nullable: true })
  readonly tariff: PublicTariffDto | null;

  @ApiProperty({ type: PublicBrandingDto, description: 'How the operator wants the page to look' })
  readonly branding: PublicBrandingDto;

  constructor(view: PublicPlaceView) {
    this.operator_name = view.site.operatorName;
    this.site_name = view.site.siteName;
    this.address = view.site.address as SiteAddressDto;
    this.time_zone = view.site.timeZone;
    this.charger_identity = view.charger.ocppIdentity;
    this.ocpp_connector_id = view.connector.ocppConnectorId;
    this.connector_label = view.connector.label;
    this.connector_type = view.connector.type;
    this.current_type = view.connector.currentType;
    this.max_power_kw = view.connector.maxPowerKw;
    this.connector_status = view.connector.status;
    this.is_charger_online = view.charger.isOnline;
    this.availability = view.availability;
    this.is_card_payment_accepted = view.isCardPaymentAccepted;
    this.hold_amount = view.holdAmount;
    this.tariff = view.tariff;
    this.branding = new PublicBrandingDto(view.brand);
  }
}
