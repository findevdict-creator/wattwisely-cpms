import { CannotStarts } from './cannot-start';
import { ChargingFixtures } from './charging.fixture';
import { PowerBars } from './power-bars';
import { ReceiptRows } from './receipt-rows';
import { StartingSteps } from './starting-steps';

describe('the charging screens’ words', () => {
  it('says why a plug cannot start, with the way forward', () => {
    expect(CannotStarts.of(ChargingFixtures.place())).toBeNull();
    const members = ChargingFixtures.place({ can_charge: false, reason: 'private_site' });
    expect(CannotStarts.of(members)).toMatchObject({
      chip: 'Members only',
      title: 'Private charger',
      text: 'Only members of Acme Charging can charge here. Ask Acme Charging for an invitation.',
      action: 'ask_operator',
    });
    const noCard = ChargingFixtures.place({
      can_charge: false,
      reason: 'no_payment_method',
      card: null,
    });
    expect(CannotStarts.of(noCard)).toMatchObject({
      title: 'Add a card first',
      text: 'Acme Charging asks for a card hold of €20.00 before a charge.',
    });
    const offline = {
      ...ChargingFixtures.place({ can_charge: false, reason: 'plug_unavailable' }),
      availability: 'offline' as const,
    };
    expect(CannotStarts.of(offline)).toMatchObject({ chip: 'Offline', title: 'Charger offline' });
  });

  it('walks through the hold, the charger and the car while starting', () => {
    expect(
      StartingSteps.of(ChargingFixtures.charge()).map((step) => [step.label, step.state]),
    ).toEqual([
      ['Card approved · hold €20.00', 'done'],
      ['Waiting for the charger…', 'now'],
      ['Plug in your car', 'todo'],
      ['Charging', 'todo'],
    ]);
    const free = ChargingFixtures.charge({
      is_paid: false,
      payment: null,
      payment_rule: {
        outcome: 'free',
        decided_by: 'group',
        label: 'Depot staff',
        words: 'Free: group Depot staff',
      },
    });
    expect(StartingSteps.of(free)[0]).toEqual({ label: 'Free: group Depot staff', state: 'done' });
  });

  it('draws the power as bars against the highest, and reads the latest battery', () => {
    const reading = (power: number | null, battery: number | null) => ({
      at: '',
      energy_wh: 0,
      power_w: power,
      soc_percent: battery,
    });
    const readings = [
      reading(null, null),
      reading(20000, 40),
      reading(40000, 50),
      reading(10000, null),
    ];
    expect(PowerBars.of(readings)).toEqual([0.5, 1, 0.25]);
    expect(PowerBars.latest(readings, 'soc_percent')).toBe(50);
    expect(PowerBars.of([reading(null, null)])).toEqual([]);
    expect(PowerBars.of(Array.from({ length: 40 }, () => reading(1000, null)))).toHaveLength(18);
  });

  it('writes the receipt lines as the design does', () => {
    const rows = ReceiptRows.of(
      [
        {
          kind: 'energy',
          band_name: 'off-peak',
          from: null,
          to: null,
          quantity: 10000,
          unit: 'wh',
          unit_price: '0.3000',
          net: 244,
          tax: 56,
          gross: 300,
        },
        {
          kind: 'idle',
          band_name: null,
          from: null,
          to: null,
          quantity: 10,
          unit: 'min',
          unit_price: '0.1000',
          net: 81,
          tax: 19,
          gross: 100,
        },
      ],
      'EUR',
    );
    expect(rows).toEqual([
      { label: '10.0 kWh off-peak × €0.30', value: '€3.00' },
      { label: 'Idle 10 min × €0.10', value: '€1.00' },
    ]);
  });
});
