import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { NavController } from '@ionic/angular';
import { DriverChargesApiService } from '@wattwisely/driver-core';
import { of, throwError } from 'rxjs';
import { ChargeStarter } from './charge-starter';
import { ChargingFixtures } from './charging.fixture';

describe('ChargeStarter', () => {
  function setUp(start: jest.Mock) {
    const navController = { navigateRoot: jest.fn(async () => true) };
    TestBed.configureTestingModule({
      providers: [
        ChargeStarter,
        { provide: DriverChargesApiService, useValue: { start } },
        { provide: NavController, useValue: navController },
      ],
    });
    return { starter: TestBed.inject(ChargeStarter), navController };
  }

  it('asks consent at a new operator, then the card for a paid charge, and starts a free one at once', () => {
    const paid = ChargingFixtures.place();
    expect(ChargeStarter.next(paid, false)).toBe('card');
    const firstTime = ChargingFixtures.place({ needs_consent: true });
    expect(ChargeStarter.next(firstTime, false)).toBe('consent');
    expect(ChargeStarter.next(firstTime, true)).toBe('card');
    const payment = { ...paid.access.payment, outcome: 'free' as const };
    expect(ChargeStarter.next(ChargingFixtures.place({ payment }), false)).toBe('start');
  });

  it('starts the charge and puts its page in place of the plug', async () => {
    const start = jest.fn(() => of(ChargingFixtures.charge()));
    const { starter, navController } = setUp(start);
    await starter.start(ChargingFixtures.place(), true);
    expect(start).toHaveBeenCalledWith('SIM-001', 1, true);
    expect(navController.navigateRoot).toHaveBeenCalledWith(['/charges', 'session-1']);
    expect(starter.isStarting()).toBe(false);
  });

  it('says why the API refused, and stays on the page', async () => {
    const problem = new HttpErrorResponse({
      status: 409,
      error: { detail: 'The plug is in use.' },
    });
    const { starter, navController } = setUp(jest.fn(() => throwError(() => problem)));
    await starter.start(ChargingFixtures.place(), false);
    expect(starter.error()).toBe('The plug is in use.');
    expect(navController.navigateRoot).not.toHaveBeenCalled();
  });
});
