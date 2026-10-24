import { ApiProperty } from '@nestjs/swagger';

/** A group a driver belongs to. */
export class DriverGroupDto {
  @ApiProperty() readonly id: string;
  @ApiProperty() readonly name: string;

  constructor(group: { id: string; name: string }) {
    this.id = group.id;
    this.name = group.name;
  }
}
