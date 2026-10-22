import { ApiProperty } from '@nestjs/swagger';
import { TariffSummary } from '../tariff-record';
import { TariffVersionDto } from './tariff-version.dto';

/** A tariff as GET /v1/tariffs and GET /v1/tariffs/{id} return it, with the prices in force. */
export class TariffDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty({ example: 'GBP' })
  readonly currency: string;

  @ApiProperty({ enum: ['active', 'archived'] })
  readonly status: string;

  @ApiProperty({ description: 'Sites whose new sessions are priced with it' })
  readonly site_count: number;

  @ApiProperty({ type: TariffVersionDto })
  readonly current_version: TariffVersionDto;

  @ApiProperty({ description: 'Send back as If-Match when changing the tariff' })
  readonly version: number;

  @ApiProperty()
  readonly created_at: string;

  @ApiProperty()
  readonly updated_at: string;

  constructor(tariff: TariffSummary) {
    this.id = tariff.id;
    this.name = tariff.name;
    this.currency = tariff.currency;
    this.status = tariff.status;
    this.site_count = tariff.siteCount;
    this.current_version = new TariffVersionDto(tariff.currentVersion);
    this.version = tariff.version;
    this.created_at = tariff.createdAt.toISOString();
    this.updated_at = tariff.updatedAt.toISOString();
  }
}
