import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

/** Body of POST /v1/chargers/{id}/commands/reset. */
export class ResetRequestDto {
  @ApiProperty({ enum: ['soft', 'hard'], description: 'soft: restart when idle; hard: reboot now' })
  @IsIn(['soft', 'hard'])
  readonly type!: 'soft' | 'hard';
}
