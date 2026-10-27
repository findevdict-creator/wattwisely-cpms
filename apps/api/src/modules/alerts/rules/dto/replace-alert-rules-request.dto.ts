import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { AlertRuleRequestDto } from './alert-rule-request.dto';

/**
 * Body of PUT /v1/alert-rules: the tenant's complete routing (NTF-03). An alert type
 * without rules goes to the default roles; an empty list means defaults for every type.
 */
export class ReplaceAlertRulesRequestDto {
  @ApiProperty({ type: [AlertRuleRequestDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => AlertRuleRequestDto)
  readonly rules!: AlertRuleRequestDto[];
}
