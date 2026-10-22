import { ApiProperty } from '@nestjs/swagger';
import { ConnectorRecord } from '../../../assets/connectors/connector-record';

/** One plug's QR code for the sticker on the charger. */
export class ConnectorQrCodeDto {
  @ApiProperty()
  readonly connector_id: string;

  @ApiProperty({ example: 1 })
  readonly ocpp_connector_id: number;

  @ApiProperty({ example: 'A' })
  readonly label: string;

  @ApiProperty({ example: 'https://charge.example.com/c/WW-7KQ4M2XR9T/1' })
  readonly url: string;

  @ApiProperty({ description: 'The QR code as an SVG document' })
  readonly svg: string;

  constructor(connector: ConnectorRecord, url: string, svg: string) {
    this.connector_id = connector.id;
    this.ocpp_connector_id = connector.ocppConnectorId;
    this.label = connector.label;
    this.url = url;
    this.svg = svg;
  }
}
