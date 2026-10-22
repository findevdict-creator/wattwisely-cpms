import { Injectable, Logger } from '@nestjs/common';
import { HandlerResult } from '../adapters/action-handler';
import { V16Adapter } from '../adapters/v16/v16-adapter';
import { ChargerConnection } from '../connection/charger-connection';
import { SchemaValidator } from '../validation/schema-validator';
import { OcppCallError } from './ocpp-call-error';
import { CallFrame } from './ocpp-frame';

/**
 * Takes a CALL from the charger through the steps the OCPP gateway design lists:
 * known action, booted (only BootNotification before that), payload valid, handled.
 * Anything that goes wrong becomes the CALLERROR the pipeline sends back.
 */
@Injectable()
export class CallProcessor {
  static readonly BOOT = 'BootNotification';

  private readonly logger = new Logger(CallProcessor.name);

  constructor(
    private readonly adapter: V16Adapter,
    private readonly validator: SchemaValidator,
  ) {}

  async process(connection: ChargerConnection, frame: CallFrame): Promise<HandlerResult> {
    const handler = this.adapter.handlerFor(frame.action);
    if (!connection.isBooted && frame.action !== CallProcessor.BOOT) {
      throw new OcppCallError('SecurityError', 'Send BootNotification first.');
    }
    this.validator.validate(frame.action, frame.payload);
    try {
      return await handler.handle(connection, frame.payload);
    } catch (error) {
      if (error instanceof OcppCallError) {
        throw error;
      }
      this.logger.error(
        `${frame.action} from ${connection.charger.identity} failed: ${(error as Error).message}`,
      );
      throw new OcppCallError('InternalError', 'The message could not be processed.');
    }
  }
}
