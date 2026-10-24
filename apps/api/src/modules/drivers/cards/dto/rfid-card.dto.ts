import { ApiProperty } from '@nestjs/swagger';
import { RfidCardRecord } from '../rfid-card-record';

/** An RFID card as the API returns it (story DRV-03). */
export class RfidCardDto {
  @ApiProperty() readonly id: string;
  @ApiProperty() readonly driver_id: string;
  @ApiProperty({ example: '04A1B2C3D4E5F6', description: 'What the charger sends as idTag' })
  readonly id_tag: string;
  @ApiProperty({ example: 'Blue card' }) readonly label: string;
  @ApiProperty({ enum: ['active', 'blocked', 'lost'] }) readonly status: string;
  @ApiProperty({ nullable: true, type: String }) readonly expires_at: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'The last time a charger accepted it' })
  readonly last_used_at: string | null;
  @ApiProperty() readonly version: number;
  @ApiProperty() readonly created_at: string;

  constructor(card: RfidCardRecord) {
    this.id = card.id;
    this.driver_id = card.driverId;
    this.id_tag = card.idTag;
    this.label = card.label;
    this.status = card.status;
    this.expires_at = card.expiresAt?.toISOString() ?? null;
    this.last_used_at = card.lastUsedAt?.toISOString() ?? null;
    this.version = card.version;
    this.created_at = card.createdAt.toISOString();
  }
}
