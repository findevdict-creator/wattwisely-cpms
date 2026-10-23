import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/** Body of POST /v1/managed-service/accept: the Owner's explicit acceptance of the terms. */
export class AcceptManagedServiceRequestDto {
  @ApiProperty({ description: 'Must be true' })
  @IsBoolean()
  readonly accept_terms!: boolean;
}
