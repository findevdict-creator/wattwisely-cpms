import { ActionHandler, HandlerResult } from './action-handler';

/**
 * For messages the platform has nothing to do with yet, but a charger must not be
 * punished for sending: the payload is validated, kept in the message log like every
 * frame, and answered with the empty result the spec asks for.
 */
export class AcknowledgeHandler implements ActionHandler {
  constructor(readonly action: string) {}

  handle(): Promise<HandlerResult> {
    return Promise.resolve({ reply: {} });
  }
}
