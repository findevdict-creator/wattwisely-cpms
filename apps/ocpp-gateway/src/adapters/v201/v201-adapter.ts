import { Inject, Injectable } from '@nestjs/common';
import { OcppVersion } from '@wattwisely/ocpp-contracts';
import { OcppCallError } from '../../transport/ocpp-call-error';
import { SchemaValidator } from '../../validation/schema-validator';
import { V201Schemas } from '../../validation/v201-schemas';
import { AcknowledgeHandler } from '../acknowledge.handler';
import { ActionHandler } from '../action-handler';
import { OcppAdapter } from '../ocpp-adapter';
import { V201_HANDLERS } from './v201-handlers.token';

/**
 * OCPP 2.0.1: the handlers for what a charging station sends and the schemas its payloads
 * must match. Messages the platform does not act on yet but a station is bound to send
 * are acknowledged, so a station is never told that a required message is unknown.
 */
@Injectable()
export class V201Adapter implements OcppAdapter {
  /** Validated, logged and answered with an empty result; nothing is recorded from them yet. */
  static readonly ACKNOWLEDGED = [
    'SecurityEventNotification',
    'NotifyEvent',
    'FirmwareStatusNotification',
    'LogStatusNotification',
  ];

  readonly version: OcppVersion = '2.0.1';

  private readonly handlers = new Map<string, ActionHandler>();
  private readonly validator = new SchemaValidator(V201Schemas.SHARED, V201Schemas.MESSAGES);

  constructor(@Inject(V201_HANDLERS) handlers: ActionHandler[]) {
    for (const handler of handlers) {
      this.handlers.set(handler.action, handler);
    }
    for (const action of V201Adapter.ACKNOWLEDGED) {
      this.handlers.set(action, new AcknowledgeHandler(action));
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
