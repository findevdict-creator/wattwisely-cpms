/** The OCPP versions the gateway speaks: the ocpp_version enum values. */
export type OcppVersion = '1.6' | '2.0.1';

/**
 * Which version a charger speaks is settled at the WebSocket upgrade, from the
 * subprotocols it offers in Sec-WebSocket-Protocol (OCPP-J 1.6 section 3.1.2, OCPP 2.0.1
 * part 4 section 2.1.3). Each version has one subprotocol name; the gateway answers with
 * the one it picked and the charger speaks that version for the life of the socket.
 */
export class OcppVersions {
  static readonly ALL: OcppVersion[] = ['1.6', '2.0.1'];

  static readonly SUBPROTOCOLS: Record<OcppVersion, string> = {
    '1.6': 'ocpp1.6',
    '2.0.1': 'ocpp2.0.1',
  };

  static subprotocolOf(version: OcppVersion): string {
    return OcppVersions.SUBPROTOCOLS[version];
  }

  /** The version behind a subprotocol name, or null for one the gateway does not speak. */
  static fromSubprotocol(subprotocol: string): OcppVersion | null {
    return (
      OcppVersions.ALL.find((version) => OcppVersions.SUBPROTOCOLS[version] === subprotocol) ?? null
    );
  }
}
