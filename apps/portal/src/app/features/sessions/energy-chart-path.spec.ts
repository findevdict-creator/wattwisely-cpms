import { SessionReading } from '../../core/api/models/session';
import { EnergyChartPath } from './energy-chart-path';

describe('EnergyChartPath', () => {
  const reading = (at: string, energyWh: number | null): SessionReading => ({
    at,
    energy_wh: energyWh,
    power_w: null,
    soc_percent: null,
  });
  const box = { width: 120, height: 70, padding: 10 };

  it('draws energy against time, from the bottom left to the top right', () => {
    const path = EnergyChartPath.of(
      [
        reading('2026-03-10T16:30:00Z', 0),
        reading('2026-03-10T17:00:00Z', 10000),
        reading('2026-03-10T17:10:00Z', null),
        reading('2026-03-10T17:30:00Z', 20000),
      ],
      box,
    );
    expect(path).toBe('M10.0,60.0 L60.0,35.0 L110.0,10.0');
  });

  it('draws nothing with fewer than two readings', () => {
    expect(EnergyChartPath.of([reading('2026-03-10T16:30:00Z', 0)], box)).toBe('');
  });
});
