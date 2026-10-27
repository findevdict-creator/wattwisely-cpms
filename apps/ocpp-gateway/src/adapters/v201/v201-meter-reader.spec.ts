import { V201MeterReader } from './v201-meter-reader';

describe('V201MeterReader', () => {
  it('reads the energy register in Wh when measurand and unit are left out', () => {
    const [reading] = V201MeterReader.read([
      { timestamp: '2026-01-01T10:00:00Z', sampledValue: [{ value: 1500 }] },
    ]);
    expect(reading).toMatchObject({ energyWh: 1500, powerW: null, socPercent: null });
    expect(reading.samples).toEqual([
      { value: '1500', measurand: 'Energy.Active.Import.Register', unit: 'Wh' },
    ]);
  });

  it('applies the unit and the multiplier, and keeps the context', () => {
    const [reading] = V201MeterReader.read([
      {
        timestamp: '2026-01-01T10:00:00Z',
        sampledValue: [
          {
            value: 12.345,
            context: 'Sample.Periodic',
            measurand: 'Energy.Active.Import.Register',
            unitOfMeasure: { unit: 'kWh' },
          },
          {
            value: 7.2,
            measurand: 'Power.Active.Import',
            unitOfMeasure: { unit: 'W', multiplier: 3 },
          },
          { value: 55, measurand: 'SoC' },
        ],
      },
    ]);
    expect(reading).toMatchObject({ energyWh: 12345, powerW: 7200, socPercent: 55 });
    expect(reading.samples[0]).toMatchObject({ context: 'Sample.Periodic', unit: 'kWh' });
    expect(reading.samples[2]).toMatchObject({ unit: 'Percent' });
  });

  it('sums phases when no total is sent', () => {
    const [reading] = V201MeterReader.read([
      {
        timestamp: '2026-01-01T10:00:00Z',
        sampledValue: [
          { value: 100, phase: 'L1' },
          { value: 100, phase: 'L2' },
          { value: 100, phase: 'L3' },
        ],
      },
    ]);
    expect(reading.energyWh).toBe(300);
  });
});
