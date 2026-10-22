import { Inject, Injectable } from '@nestjs/common';
import { OcppCallError } from '../../transport/ocpp-call-error';
import { ActionHandler } from '../action-handler';
import { V16_HANDLERS } from './v16-handlers.token';

/** Finds the handler for an OCPP 1.6 action. OCPP 2.0.1 gets its own adapter in M2. */
@Injectable()
export class V16Adapter {
  private readonly handlers = new Map<string, ActionHandler>();

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
}
