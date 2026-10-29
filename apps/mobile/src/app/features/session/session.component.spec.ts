import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController, provideIonicAngular } from '@ionic/angular';
import { DriverChargeDetail, DriverChargesApiService } from '@wattwisely/driver-core';
import { IconRegistrar } from '@wattwisely/ui';
import { of } from 'rxjs';
import { ChargingFixtures } from '../../core/charging/charging.fixture';
import { SessionComponent } from './session.component';

describe('SessionComponent', () => {
  async function render(charge: DriverChargeDetail) {
    const readings = [
      { at: '', energy_wh: 0, power_w: null, soc_percent: null },
      { at: '', energy_wh: 12400, power_w: 48000, soc_percent: 64 },
    ];
    const api = {
      charge: jest.fn(() => of(charge)),
      readings: jest.fn(() => of(readings)),
      stop: jest.fn(() => of({ ...charge, is_stop_requested: true })),
    };
    TestBed.configureTestingModule({
      imports: [SessionComponent],
      providers: [
        provideRouter([]),
        provideIonicAngular(),
        { provide: DriverChargesApiService, useValue: api },
        { provide: NavController, useValue: { navigateBack: jest.fn() } },
      ],
    });
    TestBed.inject(IconRegistrar).register();
    const fixture = TestBed.createComponent(SessionComponent);
    fixture.componentRef.setInput('id', charge.id);
    fixture.componentInstance.ionViewWillEnter();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const text = (id: string) =>
      element.querySelector(`[data-testid="${id}"]`)?.textContent?.trim();
    return {
      fixture,
      element,
      text,
      api,
      done: () => fixture.componentInstance.ionViewWillLeave(),
    };
  }

  it('ticks off the hold while the charger starts', async () => {
    const { text, done } = await render(ChargingFixtures.charge());
    expect(text('title')).toBe('Starting your charge');
    expect(text('steps')).toContain('Card approved · hold €20.00');
    done();
  });

  it('shows the live charge with its power, and stops it', async () => {
    const charge = ChargingFixtures.charge({
      status: 'charging',
      energy_wh: 12400,
      amount: 558,
      can_stop: true,
    });
    const { fixture, element, text, api, done } = await render(charge);
    expect(text('title')).toBe('Charging');
    expect(text('status')).toBeUndefined();
    expect(text('energy')).toBe('12.4 kWh');
    expect(text('power')).toBe('48 kW');
    expect(text('cost')).toBe('€5.58');
    expect(text('battery')).toBe('64%');
    expect(element.querySelectorAll('[data-testid="power-bars"] span')).toHaveLength(1);
    (element.querySelector('[data-testid="stop"]') as HTMLElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.stop).toHaveBeenCalledWith('session-1');
    expect(text('stopping')).toContain('Stopping');
    done();
  });

  it('ends with the receipt and what became of the hold', async () => {
    const charge = ChargingFixtures.charge({
      status: 'completed',
      ended_at: '2026-10-29T18:41:00Z',
      energy_wh: 10000,
      amount: 300,
      payment: { ...ChargingFixtures.PAYMENT, status: 'captured' },
      receipt: {
        lines: [
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
        ],
        gross: 300,
        net: 244,
        tax: 56,
        priced_at: '2026-10-29T18:42:00Z',
      },
    });
    const { text } = await render(charge);
    expect(text('title')).toBe('Charging complete');
    expect(text('receipt')).toContain('10.0 kWh off-peak × €0.30');
    expect(text('total')).toBe('€3.00');
    expect(text('hold')).toContain('Held on Visa •••• 4242');
    expect(text('hold')).toContain('€17.00');
  });

  it('offers another card when the bank refused the hold', async () => {
    const payment = {
      ...ChargingFixtures.PAYMENT,
      status: 'failed',
      failure_message: 'Insufficient funds',
    };
    const { text, element } = await render(
      ChargingFixtures.charge({ status: 'failed', payment, failure_reason: 'declined' }),
    );
    expect(text('notice-title')).toBe('Your bank refused the hold');
    expect(element.querySelector('[data-testid="choose-card"]')).not.toBeNull();
  });
});
