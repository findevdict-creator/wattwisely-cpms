import { Connector, ConnectorType } from '../../core/api/models/charger';

/** A connector's plug in a few words, as lists show it: "CCS2 · 150 kW". */
export class PlugLabel {
  static readonly NAMES: Record<ConnectorType, string> = {
    type2: 'Type 2',
    ccs2: 'CCS2',
    chademo: 'CHAdeMO',
    type1: 'Type 1',
    ccs1: 'CCS1',
    nacs: 'NACS',
    gbt: 'GB/T',
    unknown: 'Plug not set',
  };

  static of(connector: Pick<Connector, 'type' | 'max_power_kw'>): string {
    const name = PlugLabel.NAMES[connector.type] ?? connector.type;
    return connector.max_power_kw ? `${name} · ${connector.max_power_kw} kW` : name;
  }
}
