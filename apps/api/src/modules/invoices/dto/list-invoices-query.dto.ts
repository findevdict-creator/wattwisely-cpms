import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** The statuses the list can be narrowed to; overdue is issued with the due date passed. */
export type InvoiceListStatus = 'draft' | 'issued' | 'overdue' | 'paid' | 'void';

/** Query of GET /v1/admin/invoices. Newest month first. */
export class ListInvoicesQueryDto {
  @ApiProperty({ required: false, default: 25, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit?: number;

  @ApiProperty({ required: false, description: 'next_cursor from the previous page' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  readonly cursor?: string;

  @ApiProperty({ required: false, enum: ['draft', 'issued', 'overdue', 'paid', 'void'] })
  @IsOptional()
  @IsIn(['draft', 'issued', 'overdue', 'paid', 'void'])
  readonly status?: InvoiceListStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('all')
  readonly tenant_id?: string;

  @ApiProperty({ required: false, example: '2026-09', description: 'The month billed' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  readonly month?: string;
}
