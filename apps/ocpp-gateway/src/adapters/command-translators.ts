import { Injectable } from '@nestjs/common';
import { OcppVersion } from '@wattwisely/ocpp-contracts';
import { CommandTranslator } from './command-translator';
import { V16CommandTranslator } from './v16/v16-command.translator';
import { V201CommandTranslator } from './v201/v201-command.translator';

/** The command translator for each OCPP version; the connection's version picks it. */
@Injectable()
export class CommandTranslators {
  private readonly translators: Record<OcppVersion, CommandTranslator>;

  constructor(v16: V16CommandTranslator, v201: V201CommandTranslator) {
    this.translators = { '1.6': v16, '2.0.1': v201 };
  }

  for(version: OcppVersion): CommandTranslator {
    return this.translators[version];
  }
}
