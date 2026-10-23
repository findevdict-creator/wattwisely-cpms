import { Injectable, Logger } from '@nestjs/common';
import { ChargerConnection } from '../connection/charger-connection';
import { GatewayMetrics } from '../metrics/gateway-metrics';
import { CallProcessor } from './call-processor';
import { FrameLogger } from './frame-logger';
import { OcppCallError } from './ocpp-call-error';
import { CallFrame, OcppFrame } from './ocpp-frame';
import { OcppFrameCodec } from './ocpp-frame-codec';

/**
 * Every text frame a charger sends comes through here: decode, log, and either answer
 * the CALL or hand the reply to the command waiting for it. Each frame gets exactly one
 * answer, a CALLRESULT or a CALLERROR, as OCPP-J requires.
 */
@Injectable()
export class MessagePipeline {
  private readonly logger = new Logger(MessagePipeline.name);

  constructor(
    private readonly processor: CallProcessor,
    private readonly frames: FrameLogger,
    private readonly metrics: GatewayMetrics,
  ) {}

  async handle(connection: ChargerConnection, text: string): Promise<void> {
    connection.touch();
    let frame: OcppFrame;
    try {
      frame = OcppFrameCodec.decode(text);
    } catch (error) {
      this.refuse(connection, text, error as OcppCallError);
      return;
    }
    if (frame.type !== 'call') {
      this.frames.incoming(connection, frame, connection.resolve(frame) ?? '');
      return;
    }
    this.frames.incoming(connection, frame, frame.action);
    await this.answer(connection, frame);
  }

  private async answer(connection: ChargerConnection, frame: CallFrame): Promise<void> {
    const startedAt = performance.now();
    try {
      const result = await this.processor.process(connection, frame);
      connection.send(OcppFrameCodec.encodeResult(frame.id, result.reply));
      this.metrics.call(frame.action, 'ok', (performance.now() - startedAt) / 1000);
      this.frames.result(connection, frame.id, frame.action, result.reply);
      await result.after?.();
    } catch (error) {
      const callError =
        error instanceof OcppCallError
          ? error
          : new OcppCallError('InternalError', 'The message could not be processed.');
      this.logger.warn(`${frame.action} from ${connection.charger.identity}: ${callError.message}`);
      connection.send(OcppFrameCodec.encodeError(frame.id, callError));
      this.metrics.call(frame.action, callError.code, (performance.now() - startedAt) / 1000);
      this.frames.error(connection, frame.id, frame.action, callError);
    }
  }

  /** A frame that is not OCPP-J at all: answered when it at least carries an id. */
  private refuse(connection: ChargerConnection, text: string, error: OcppCallError): void {
    this.logger.warn(`Bad frame from ${connection.charger.identity}: ${error.description}`);
    const id = OcppFrameCodec.idOf(text);
    if (id) {
      connection.send(OcppFrameCodec.encodeError(id, error));
      this.frames.error(connection, id, '', error);
    }
  }
}
