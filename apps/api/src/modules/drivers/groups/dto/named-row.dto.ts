import { ApiProperty } from '@nestjs/swagger';
import { NamedRow } from '../access-group-record';

/** A site or a driver named in a group. */
export class NamedRowDto {
  @ApiProperty() readonly id: string;
  @ApiProperty() readonly name: string;

  constructor(row: NamedRow) {
    this.id = row.id;
    this.name = row.name;
  }
}
