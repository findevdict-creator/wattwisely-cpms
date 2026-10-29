import { ChargerMessages, IncomingCall, SimulatedCharger } from '@wattwisely/charger-sim';
import { Database } from './database';
import { StackUrls } from './stack-urls';

/**
 * A charger speaking OCPP 1.6J to the stack's gateway through the charger-sim library. It
 * accepts every charging profile the gateway sends (load management, module 17) and keeps them.
 */
export class Charger16 {
  static readonly PROTOCOLS = ['ocpp1.6'];

  readonly socket: SimulatedCharger;
  readonly messages: ChargerMessages;
  readonly profiles: IncomingCall['payload'][] = [];

  constructor(identity: string, protocols = Charger16.PROTOCOLS) {
    this.socket = new SimulatedCharger({ url: StackUrls.OCPP, identity, protocols });
    this.socket.on('SetChargingProfile', (payload) => {
      this.profiles.push(payload);
      return { status: 'Accepted' };
    });
    this.messages = new ChargerMessages(this.socket);
  }

  async boot(): Promise<this> {
    await this.socket.connect();
    await this.messages.boot();
    return this;
  }

  /** The session the gateway made for a 1.6 transaction id, as the database holds it. */
  static async session(transactionId: number): Promise<{ status: string; energy_wh: string }> {
    const row = await Database.one<{ status: string; energy_wh: string }>(
      'select status, energy_wh::text as energy_wh from charging_sessions where ocpp_transaction_id = $1',
      [String(transactionId)],
    );
    return row ?? { status: 'missing', energy_wh: '' };
  }

  static minutesAgo(minutes: number): Date {
    return new Date(Date.now() - minutes * 60_000);
  }
}
