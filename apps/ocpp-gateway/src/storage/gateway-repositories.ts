import { Injectable } from '@nestjs/common';
import { GatewayChargersRepository } from './gateway-chargers.repository';
import { GatewayConnectorsRepository } from './gateway-connectors.repository';
import { MeterValuesRepository } from './meter-values.repository';
import { SessionsRepository } from './sessions.repository';

/** The tables a message handler touches, handed over together so each handler stays small. */
@Injectable()
export class GatewayRepositories {
  constructor(
    readonly chargers: GatewayChargersRepository,
    readonly connectors: GatewayConnectorsRepository,
    readonly sessions: SessionsRepository,
    readonly meterValues: MeterValuesRepository,
  ) {}
}
