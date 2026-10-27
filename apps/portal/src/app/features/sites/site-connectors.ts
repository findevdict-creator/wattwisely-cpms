import { Charger, Connector } from '../../core/api/models/charger';

/** A line of a site's connector table; a charger without connectors gets one line of its own. */
export interface ConnectorRow {
  key: string;
  charger: Charger;
  connector: Connector | null;
}

/** The connectors of every charger on a site, one table for the whole site. */
export class SiteConnectors {
  static rows(chargers: Charger[]): ConnectorRow[] {
    return chargers.flatMap((charger): ConnectorRow[] =>
      charger.connectors.length === 0
        ? [{ key: charger.id, charger, connector: null }]
        : charger.connectors.map((connector) => ({ key: connector.id, charger, connector })),
    );
  }

  /** "8 connectors on 3 chargers · 3 free now". */
  static summary(chargers: Charger[]): string {
    const connectors = chargers.flatMap((charger) => charger.connectors);
    const free = connectors.filter((connector) => connector.status === 'available').length;
    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
    return `${plural(connectors.length, 'connector')} on ${plural(chargers.length, 'charger')} · ${free} free now`;
  }
}
