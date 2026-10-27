import { ApiProperty } from '@nestjs/swagger';
import { ApiKeyRecord } from '../api-key-record';

/** An API key as the list shows it: everything but the token itself. */
export class ApiKeyDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ example: 'Fleet sync' })
  readonly name: string;

  @ApiProperty()
  readonly description: string;

  @ApiProperty({ example: 'wwk_…k7q2', description: 'Enough of the token to tell keys apart' })
  readonly key_hint: string;

  @ApiProperty({ type: [String], example: ['sessions:read', 'chargers:command'] })
  readonly permissions: string[];

  @ApiProperty({ example: 'Olivia Owner', description: 'The member the key acts for' })
  readonly created_by: string;

  @ApiProperty({ nullable: true })
  readonly expires_at: string | null;

  @ApiProperty({ nullable: true, description: 'To the minute' })
  readonly last_used_at: string | null;

  @ApiProperty({ nullable: true })
  readonly revoked_at: string | null;

  @ApiProperty({ enum: ['active', 'expired', 'revoked'] })
  readonly status: 'active' | 'expired' | 'revoked';

  @ApiProperty({ description: 'Sent back as If-Match when changing or revoking the key' })
  readonly version: number;

  @ApiProperty()
  readonly created_at: string;

  constructor(record: ApiKeyRecord, now: Date = new Date()) {
    this.id = record.id;
    this.name = record.name;
    this.description = record.description;
    this.key_hint = `wwk_…${record.keyHint}`;
    this.permissions = record.permissionKeys;
    this.created_by = record.createdByLabel;
    this.expires_at = record.expiresAt?.toISOString() ?? null;
    this.last_used_at = record.lastUsedAt?.toISOString() ?? null;
    this.revoked_at = record.revokedAt?.toISOString() ?? null;
    this.status = ApiKeyDto.statusOf(record, now);
    this.version = record.version;
    this.created_at = record.createdAt.toISOString();
  }

  private static statusOf(record: ApiKeyRecord, now: Date): 'active' | 'expired' | 'revoked' {
    if (record.revokedAt) {
      return 'revoked';
    }
    return record.expiresAt && record.expiresAt <= now ? 'expired' : 'active';
  }
}
