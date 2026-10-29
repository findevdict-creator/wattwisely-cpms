import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { NavController, provideIonicAngular } from '@ionic/angular';
import { DriverChargesApiService, DriverPlace } from '@wattwisely/driver-core';
import { IconRegistrar } from '@wattwisely/ui';
import { of } from 'rxjs';
import { ChargingFixtures } from '../../core/charging/charging.fixture';
import { PushRegistrar } from '../../core/notifications/push-registrar';
import { PlugComponent } from './plug.component';

describe('PlugComponent', () => {
  async function render(place: DriverPlace) {
    const api = {
      place: jest.fn(() => of(place)),
      start: jest.fn(() => of(ChargingFixtures.charge())),
    };
    const navController = { navigateRoot: jest.fn(async () => true), navigateBack: jest.fn() };
    TestBed.configureTestingModule({
      imports: [PlugComponent],
      providers: [
        provideRouter([]),
        provideIonicAngular(),
        { provide: DriverChargesApiService, useValue: api },
        { provide: NavController, useValue: navController },
        { provide: PushRegistrar, useValue: { enable: jest.fn(async () => true) } },
      ],
    });
    TestBed.inject(IconRegistrar).register();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(PlugComponent);
    fixture.componentRef.setInput('identity', 'SIM-001');
    fixture.componentRef.setInput('connector', '1');
    fixture.componentInstance.ionViewWillEnter();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const text = (id: string) =>
      element.querySelector(`[data-testid="${id}"]`)?.textContent?.trim();
    return { fixture, element, text, api, navigate, navController };
  }

  it('shows where the plug is, what it costs and how the driver pays', async () => {
    const { text, api } = await render(ChargingFixtures.place());
    expect(api.place).toHaveBeenCalledWith('SIM-001', '1');
    expect(text('site')).toBe('Riverside Car Park');
    expect(text('plug-line')).toBe('Connector B · CCS · DC 150 kW · 12 Riverside Road');
    expect(text('availability')).toBe('Available');
    expect(text('prices')).toContain('€0.45 per kWh');
    expect(text('estimate')).toBe('about €13.50');
    expect(text('access')).toContain('You are a member of Acme Charging');
    expect(text('access')).toContain(
      'Hold of €20.00 on Visa •••• 4242, charged only what you use.',
    );
  });

  it('goes on to the card for a paid charge', async () => {
    const { element, navigate, api } = await render(ChargingFixtures.place());
    (element.querySelector('[data-testid="start"]') as HTMLElement).click();
    expect(navigate).toHaveBeenCalledWith(['/plug', 'SIM-001', '1', 'card']);
    expect(api.start).not.toHaveBeenCalled();
  });

  it('starts a free charge at once', async () => {
    const payment = {
      ...ChargingFixtures.ACCESS.payment,
      outcome: 'free' as const,
      words: 'Free: group Depot staff',
    };
    const { fixture, element, api, navController } = await render(
      ChargingFixtures.place({ payment }),
    );
    (element.querySelector('[data-testid="start"]') as HTMLElement).click();
    await fixture.whenStable();
    expect(api.start).toHaveBeenCalledWith('SIM-001', 1, false);
    expect(navController.navigateRoot).toHaveBeenCalledWith(['/charges', 'session-1']);
  });

  it('says why a plug cannot start, without a start button', async () => {
    const place = ChargingFixtures.place({
      can_charge: false,
      reason: 'private_site',
      is_private_site: true,
    });
    const { element, text } = await render(place);
    expect(text('notice-title')).toBe('Private charger');
    expect(element.querySelector('[data-testid="start"]')).toBeNull();
    expect(element.textContent).toContain('Ask for an invitation');
  });
});
