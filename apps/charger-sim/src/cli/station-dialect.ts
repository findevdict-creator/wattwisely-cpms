import { SimulatedCharger } from '@wattwisely/charger-sim';
import { CommandAnswers } from './command-answers';

/** What a boot answer says in either version. */
export interface BootAnswer {
  status: string;
  interval: number;
}

/** What the station learns when a transaction starts, in either version. */
export interface TransactionStart {
  /** As a string in both versions: 1.6's integer id is kept as its decimal text. */
  transactionId: string;
  tokenStatus: string;
}

/**
 * The demo charger's behaviour is the same in OCPP 1.6J and 2.0.1; what differs is how
 * each step is said on the wire and how the platform's commands arrive. A dialect holds
 * those differences, with the connector's lifecycle told in 1.6's status words.
 */
export interface StationDialect {
  readonly protocols: string[];
  boot(): Promise<BootAnswer>;
  heartbeat(): Promise<unknown>;
  /** What the station says about itself as a whole once booted (1.6: connector 0). */
  announceStation(): Promise<void>;
  connectorStatus(connectorId: number, status: string): Promise<void>;
  /** The token's status word: Accepted, Blocked, Invalid, … */
  authorize(idTag: string): Promise<string>;
  startTransaction(connectorId: number, idTag: string, meterWh: number): Promise<TransactionStart>;
  meterValues(
    connectorId: number,
    transactionId: string,
    meterWh: number,
    powerW: number,
  ): Promise<void>;
  stopTransaction(
    connectorId: number,
    transactionId: string,
    meterWh: number,
    reason: string,
  ): Promise<void>;
  /** Registers the version's command actions on the socket, each answered by `answers`. */
  installCommands(charger: SimulatedCharger, answers: CommandAnswers): void;
}
