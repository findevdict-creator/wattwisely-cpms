import { ApiProperty } from '@nestjs/swagger';
import { ReportExportRecord } from '../report-exports.repository';

/** A background export and where it is (story SES-04). */
export class ReportExportDto {
  @ApiProperty() readonly id: string;
  @ApiProperty({ enum: ['sessions', 'usage', 'audit_log'] }) readonly kind: string;
  @ApiProperty({ enum: ['queued', 'running', 'ready', 'failed', 'expired'] })
  readonly status: string;
  @ApiProperty() readonly file_name: string;
  @ApiProperty({ nullable: true, type: Number }) readonly row_count: number | null;
  @ApiProperty({ nullable: true, type: Number, description: 'Of the gzipped file' })
  readonly size_bytes: number | null;
  @ApiProperty({ description: 'More rows matched than an export holds (100,000)' })
  readonly is_truncated: boolean;
  @ApiProperty({ nullable: true, type: String }) readonly error: string | null;
  @ApiProperty() readonly created_at: string;
  @ApiProperty({ nullable: true, type: String }) readonly finished_at: string | null;
  @ApiProperty({ nullable: true, type: String }) readonly expires_at: string | null;

  constructor(item: ReportExportRecord) {
    const isTruncated = item.error === 'truncated';
    this.id = item.id;
    this.kind = item.kind;
    this.status = item.status;
    this.file_name = item.fileName;
    this.row_count = item.rowCount;
    this.size_bytes = item.sizeBytes;
    this.is_truncated = isTruncated;
    this.error = isTruncated ? null : item.error;
    this.created_at = item.createdAt.toISOString();
    this.finished_at = item.finishedAt?.toISOString() ?? null;
    this.expires_at = item.expiresAt?.toISOString() ?? null;
  }
}
