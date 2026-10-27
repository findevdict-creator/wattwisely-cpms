import { ApiProperty } from '@nestjs/swagger';
import { ChannelRecord } from '../messaging-record';

/** The tenant's WhatsApp channel. Version 0 means none has been set up; send it back as If-Match. */
export class MessagingChannelDto {
  @ApiProperty({ enum: ['whatsapp'] })
  readonly provider: 'whatsapp';

  @ApiProperty({
    example: '106540352242922',
    description: 'The phone number id in the WhatsApp Business account',
  })
  readonly phone_number_id: string;

  @ApiProperty({
    example: '+44 7700 900123',
    description: 'The number drivers message, as printed',
  })
  readonly display_phone_number: string;

  @ApiProperty({
    description: 'The channel has its own access token; otherwise the platform’s is used',
  })
  readonly has_access_token: boolean;

  @ApiProperty({
    description: 'The platform has a WhatsApp token, so channels without their own can send',
  })
  readonly is_platform_token_configured: boolean;

  @ApiProperty({
    description:
      'The first line drivers get when they write for the first time; empty for the default',
  })
  readonly greeting: string;

  @ApiProperty({ description: 'False pauses the channel: messages are ignored' })
  readonly is_active: boolean;

  @ApiProperty({ description: 'Where Meta must deliver the webhook' })
  readonly webhook_url: string;

  @ApiProperty({ description: '0 until the channel is first saved' })
  readonly version: number;

  @ApiProperty({ nullable: true })
  readonly updated_at: string | null;

  constructor(
    record: ChannelRecord | null,
    platform: { webhookUrl: string; isPlatformTokenConfigured: boolean },
  ) {
    const channel = record ?? MessagingChannelDto.NONE;
    this.provider = 'whatsapp';
    this.phone_number_id = channel.phoneNumberId;
    this.display_phone_number = channel.displayPhoneNumber;
    this.has_access_token = channel.hasAccessToken;
    this.is_platform_token_configured = platform.isPlatformTokenConfigured;
    this.greeting = channel.greeting;
    this.is_active = channel.isActive;
    this.webhook_url = platform.webhookUrl;
    this.version = channel.version;
    this.updated_at = channel.updatedAt?.toISOString() ?? null;
  }

  /** What a tenant without a channel sees: everything empty, version 0. */
  private static readonly NONE = {
    phoneNumberId: '',
    displayPhoneNumber: '',
    hasAccessToken: false,
    greeting: '',
    isActive: true,
    version: 0,
    updatedAt: null as Date | null,
  };
}
