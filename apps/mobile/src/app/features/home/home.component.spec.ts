import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { IconRegistrar } from '@wattwisely/ui';
import { AccountStore } from '../../core/account/account.store';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  function render(operators: { tenant_id: string; operator_name: string; status: string }[]) {
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
  });
});
