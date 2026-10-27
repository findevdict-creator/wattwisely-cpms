import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../common/request/current-auth.decorator';
import { IfMatchAllowingNew } from '../../common/request/if-match.decorator';
import { RequestAuth } from '../../common/request/request-auth';
import { ConversationsService } from './conversations.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { ConversationDto } from './dto/conversation.dto';
import { MessagingChannelDto } from './dto/messaging-channel.dto';
import { TestMessageRequestDto } from './dto/test-message-request.dto';
import { UpdateMessagingChannelRequestDto } from './dto/update-messaging-channel-request.dto';
import { MessagingChannelService } from './messaging-channel.service';

/** /v1/messaging (module 17, add-on messaging_charging): the WhatsApp channel and the chats on it. */
@ApiTags('messaging')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@RouteAccess.requires('messaging:manage')
@Controller('messaging')
export class MessagingController {
  constructor(
    private readonly channel: MessagingChannelService,
    private readonly conversations: ConversationsService,
  ) {}

  @Get('channel')
  getChannel(@CurrentAuth() auth: RequestAuth): Promise<MessagingChannelDto> {
    return this.channel.get(auth.requireAccess());
  }

  /** Saves the channel; If-Match 0 the first time. */
  @Put('channel')
  updateChannel(
    @CurrentAuth() auth: RequestAuth,
    @IfMatchAllowingNew() version: number,
    @Body() body: UpdateMessagingChannelRequestDto,
  ): Promise<MessagingChannelDto> {
    return this.channel.update(auth, version, body);
  }

  /** Queues a test message the worker sends within its interval; watch it under conversations. */
  @Post('channel/test')
  @HttpCode(HttpStatus.ACCEPTED)
  async test(
    @CurrentAuth() auth: RequestAuth,
    @Body() body: TestMessageRequestDto,
  ): Promise<MessagingChannelDto> {
    return this.channel.dto(await this.conversations.test(auth.requireAccess(), body));
  }

  @Get('conversations')
  list(@CurrentAuth() auth: RequestAuth): Promise<ConversationDto[]> {
    return this.conversations.list(auth.requireAccess());
  }

  @Get('conversations/:id/messages')
  messages(
    @CurrentAuth() auth: RequestAuth,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ChatMessageDto[]> {
    return this.conversations.messages(auth.requireAccess(), id);
  }
}
