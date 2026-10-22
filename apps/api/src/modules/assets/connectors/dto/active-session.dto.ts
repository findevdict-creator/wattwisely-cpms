import { ApiProperty } from '@nestjs/swagger';
import { ActiveSession } from '../connector-record';

/** The charging session running on a connector, inside ConnectorDto. */
export class ActiveSessionDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ description: 'The OCPP 1.6 transactionId the charger uses' })
  readonly ocpp_transaction_id: number;

  @ApiProperty()
  readonly started_at: string;

  @ApiProperty({ description: 'Energy delivered so far, in Wh' })
  readonly energy_wh: number;

  constructor(session: ActiveSession) {
    this.id = session.id;
    this.ocpp_transaction_id = session.ocppTransactionId;
    this.started_at = new Date(session.startedAt).toISOString();
    this.energy_wh = session.energyWh;
  }
}
