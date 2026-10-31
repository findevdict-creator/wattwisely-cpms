import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { IconRegistrar } from '@wattwisely/ui';
import { AccountStore } from '../../core/account/account.store';
import { ChargingFixtures } from '../../core/charging/charging.fixture';
import { ChargingNowStore } from '../../core/charging/charging-now.store';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  function render(
    operators: { tenant_id: string; operator_name: string; status: string }[],
    charge: ReturnType<typeof ChargingFixtures.charge> | null = null,
  ) {
    const chargingNow = { charge: signal(charge), load: jest.fn(async () => undefined) };
    const store = {
      me: signal({ display_name: 'Dana Driver' }),
      operators: signal(operators),
      error: signal(''),
      load: jest.fn(async () => undefined),
    };
    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        provideIonicAngular(),
        { provide: AccountStore, useValue: store },
        { provide: ChargingNowStore, useValue: chargingNow },
      ],
    });
    TestBed.inject(IconRegistrar).register();
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    return { element: fixture.nativeElement as HTMLElement, store };
  }

  it('greets the driver by first name and loads their operators each time the tab opens', () => {
    const { element, store } = render([
      { tenant_id: 't-1', operator_name: 'Acme Charging', status: 'active' },
      { tenant_id: 't-2', operator_name: 'VoltHub', status: 'blocked' },
    ]);
    expect(store.load).toHaveBeenCalled();
    expect(element.querySelector('[data-testid="greeting"]')?.textContent).toMatch(/, Dana$/);
    const operators = element.querySelector('[data-testid="operators"]')?.textContent ?? '';
    expect(operators).toContain('Acme Charging');
    expect(operators).toContain('Member');
    expect(operators).toContain('Blocked');
    expect(element.querySelector('[data-testid="scan"]')?.getAttribute('href')).toBe(
      '/tabs/charge',
    );
  });

  it('says how an operator gets on the list when there is none', () => {
    const { element } = render([]);
    expect(element.querySelector('[data-testid="no-operators"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="charging-now"]')).toBeNull();
  });

  it('shows the charge under way, with a link to it', () => {
    const charge = ChargingFixtures.charge({ status: 'charging', energy_wh: 12400, amount: 558 });
    const card = render([], charge).element.querySelector('[data-testid="charging-now"]');
    expect(card?.textContent).toContain('12.4 kWh · €5.58');
    expect(card?.textContent).toContain('Riverside Car Park · Connector B');
    expect(card?.getAttribute('href')).toBe('/charges/session-1');
  });
});
