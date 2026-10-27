import { ApiProperty } from '@nestjs/swagger';

/** A card the operator registered for the driver, as the driver sees it (module 19). */
export class DriverOperatorCardDto {
  @ApiProperty() readonly id_tag: string;
  @ApiProperty() readonly label: string;
  @ApiProperty({ enum: ['active', 'blocked', 'lost'] }) readonly status: string;

  constructor(card: { idTag: string; label: string; status: string }) {
    this.id_tag = card.idTag;
    this.label = card.label;
    this.status = card.status;
  }
}
