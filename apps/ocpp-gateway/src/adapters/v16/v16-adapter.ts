import { Inject, Injectable } from '@nestjs/common';
import { OcppVersion } from '@wattwisely/ocpp-contracts';
import { OcppCallError } from '../../transport/ocpp-call-error';
import { SchemaValidator } from '../../validation/schema-validator';
import { V16Schemas } from '../../validation/v16-schemas';
import { ActionHandler } from '../action-handler';
import { OcppAdapter } from '../ocpp-adapter';
import { V16_HANDLERS } from './v16-handlers.token';

/** OCPP 1.6J: the handlers for what a charge point sends and the schemas its payloads must match. */
@Injectable()
export class V16Adapter implements OcppAdapter {
  readonly version: OcppVersion = '1.6';

  private readonly handlers = new Map<string, ActionHandler>();
  private readonly validator = new SchemaValidator(V16Schemas.SHARED, V16Schemas.MESSAGES);

  constructor(@Inject(V16_HANDLERS) handlers: ActionHandler[]) {
    for (const handler of handlers) {
      this.handlers.set(handler.action, handler);
    }
  }

  get actions(): string[] {
    return [...this.handlers.keys()];
  }

  handlerFor(action: string): ActionHandler {
    const handler = this.handlers.get(action);
    if (!handler) {
      throw new OcppCallError('NotImplemented', `${action} is not supported.`);
    }
    return handler;
  }

  validate(action: string, payload: unknown): void {
    this.validator.validate(action, payload);
  }
}
