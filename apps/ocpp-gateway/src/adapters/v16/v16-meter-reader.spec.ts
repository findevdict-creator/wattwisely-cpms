import { V16MeterReader } from './v16-meter-reader';

describe('V16MeterReader', () => {
  it('takes the cumulative energy in Wh, converting kWh, and the power and SoC', () => {
    const [reading] = V16MeterReader.read([
      {
        timestamp: '2026-01-01T10:00:00Z',
        sampledValue: [
          { value: '12.345', measurand: 'Energy.Active.Import.Register', unit: 'kWh' },
          { value: '7.2', measurand: 'Power.Active.Import', unit: 'kW' },
          { value: '55', measurand: 'SoC', unit: 'Percent' },
          { value: '230', measurand: 'Voltage', unit: 'V' },
        ],
      },
    ]);
    expect(reading).toMatchObject({
      measuredAt: new Date('2026-01-01T10:00:00Z'),
      energyWh: 12345,
      powerW: 7200,
      socPercent: 55,
    });
    expect(reading.samples).toHaveLength(4);
  });

  it('treats a sample without a measurand as the energy register, in Wh', () => {
    const [reading] = V16MeterReader.read([
      { timestamp: '2026-01-01T10:00:00Z', sampledValue: [{ value: '500' }] },
    ]);
    expect(reading).toMatchObject({ energyWh: 500, powerW: null, socPercent: null });
  });

  it('prefers the total over per-phase values, and sums phases when there is no total', () => {
    const energy = 'Energy.Active.Import.Register';
    const [withTotal] = V16MeterReader.read([
      {
        timestamp: '2026-01-01T10:00:00Z',
        sampledValue: [
          { value: '100', measurand: energy, phase: 'L1' },
          { value: '100', measurand: energy, phase: 'L2' },
          { value: '250', measurand: energy },
        ],
      },
    ]);
    expect(withTotal.energyWh).toBe(250);
    const [phasesOnly] = V16MeterReader.read([
      {
        timestamp: '2026-01-01T10:00:00Z',
        sampledValue: [
          { value: '100', measurand: energy, phase: 'L1' },
          { value: '100', measurand: energy, phase: 'L2' },
          { value: '100', measurand: energy, phase: 'L3' },
        ],
      },
    ]);
    expect(phasesOnly.energyWh).toBe(300);
  });

  it('finds the latest energy reading in time order', () => {
    const readings = V16MeterReader.read([
      { timestamp: '2026-01-01T10:05:00Z', sampledValue: [{ value: '900' }] },
      { timestamp: '2026-01-01T10:00:00Z', sampledValue: [{ value: '800' }] },
      {
        timestamp: '2026-01-01T10:10:00Z',
        sampledValue: [{ value: '7000', measurand: 'Power.Active.Import' }],
      },
    ]);
    expect(V16MeterReader.latestEnergyWh(readings)).toBe(900);
    expect(V16MeterReader.latestEnergyWh([])).toBeNull();
  });
});
