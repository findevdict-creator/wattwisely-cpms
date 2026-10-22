import { ApiProperty } from '@nestjs/swagger';
import { SessionTariff } from '../session-record';

/** The tariff and version a session is priced with. */
export class SessionTariffDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly version_number: number;

  constructor(tariff: SessionTariff) {
    this.id = tariff.tariffId;
    this.name = tariff.name;
    this.version_number = tariff.versionNumber;
  }
}
