import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { ActiveSessionLookup } from './commands/active-session.lookup';
import { ChargerCommandsController } from './commands/charger-commands.controller';
import { ChargerCommandsService } from './commands/charger-commands.service';
import { CommandNotifier } from './commands/command-notifier';
import { CommandRequestBuilder } from './commands/command-request.builder';
import { CommandSender } from './commands/command-sender';
import { CommandsController } from './commands/commands.controller';
import { CommandsRepository } from './commands/commands.repository';
import { ChargerEventHub } from './live/charger-event.hub';
import { ChargerLiveController } from './live/charger-live.controller';
import { ChargerLiveService } from './live/charger-live.service';
import { ChargerMessagesController } from './messages/charger-messages.controller';
import { ChargerMessagesService } from './messages/charger-messages.service';
import { OcppMessagesRepository } from './messages/ocpp-messages.repository';

/**
 * The API's side of the OCPP gateway (module 4): commands to chargers, the raw message
 * log and the live event stream. The gateway itself is apps/ocpp-gateway; the two meet
 * in Postgres (charger_commands, ocpp_messages and the NOTIFY channels).
 */
@Module({
  imports: [AssetsModule],
  controllers: [
    ChargerCommandsController,
    CommandsController,
    ChargerMessagesController,
    ChargerLiveController,
  ],
  providers: [
    CommandsRepository,
    ActiveSessionLookup,
    CommandRequestBuilder,
    CommandNotifier,
    CommandSender,
    ChargerCommandsService,
    OcppMessagesRepository,
    ChargerMessagesService,
    ChargerEventHub,
    ChargerLiveService,
  ],
})
export class OcppModule {}
