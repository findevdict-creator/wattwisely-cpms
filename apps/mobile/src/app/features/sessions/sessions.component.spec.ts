import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { DriverCharge } from '@wattwisely/driver-core';
import { IconRegistrar } from '@wattwisely/ui';
import { ChargingFixtures } from '../../core/charging/charging.fixture';
import { HistoryStore } from '../../core/history/history.store';
import { SessionsComponent } from './sessions.component';

describe('SessionsComponent', () => {
  function render(charges: DriverCharge[]) {
    const store = {
      charges: signal(charges),
      isLoaded: signal(true),
      error: signal(''),
      load: jest.fn(async () => undefined),
      shareCsv: jest.fn(async () => undefined),
    };
    TestBed.configureTestingModule({
      imports: [SessionsComponent],
      providers: [
        provideRouter([]),
        provideIonicAngular(),
        { provide: HistoryStore, useValue: store },
      ],
    });
    TestBed.inject(IconRegistrar).register();
    const fixture = TestBed.createComponent(SessionsComponent);
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement, store };
  }

  const acme = ChargingFixtures.charge({ status: 'completed', ended_at: '2026-10-29T18:41:00Z' });
  const volthub = {
    ...acme,
    id: 'session-2',
    tenant_id: 'volthub',
    operator_name: 'VoltHub',
    status: 'charging',
  };

  it('lists the charges by month, opens a receipt or the live page, and shares the CSV', () => {
    const { element, store } = render([acme, volthub]);
    expect(store.load).toHaveBeenCalled();
    expect(element.querySelector('[data-testid="totals"]')?.textContent).toContain('October 2026');
    const links = [...element.querySelectorAll('[data-testid="session"]')].map((row) =>
      row.getAttribute('href'),
    );
    expect(links).toEqual(['/sessions/session-1', '/charges/session-2']);
    element.querySelector<HTMLButtonElement>('[data-testid="csv"]')?.click();
    expect(store.shareCsv).toHaveBeenCalled();
  });

  it('narrows the list to one operator', () => {
    const { fixture, element } = render([acme, volthub]);
    const voltHubFilter = [...element.querySelectorAll<HTMLButtonElement>('.filters button')].find(
      (button) => button.textContent?.trim() === 'VoltHub',
    );
    voltHubFilter?.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('[data-testid="session"]')).toHaveLength(1);
    expect(element.querySelector('[data-testid="session"]')?.textContent).toContain('VoltHub');
  });

  it('says where the charges will be before the first one', () => {
    const { element } = render([]);
    expect(element.querySelector('[data-testid="no-sessions"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="csv"]')).toBeNull();
  });
});
