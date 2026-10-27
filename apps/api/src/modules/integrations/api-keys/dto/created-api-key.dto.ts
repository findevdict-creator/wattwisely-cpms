import { ApiProperty } from '@nestjs/swagger';
import { ApiKeyRecord } from '../api-key-record';
import { ApiKeyDto } from './api-key.dto';

/** The answer to POST /v1/api-keys: the key, and the token, shown this once. */
export class CreatedApiKeyDto {
  @ApiProperty({ type: ApiKeyDto })
  readonly key: ApiKeyDto;

  @ApiProperty({
    example: 'wwk_3fK9…',
    description:
      'Send it as "Authorization: Bearer <token>". It is not stored and cannot be shown again.',
  })
  readonly token: string;

  constructor(record: ApiKeyRecord, token: string) {
    this.key = new ApiKeyDto(record);
    this.token = token;
  }
}
