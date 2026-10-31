import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AccountStore } from '../account/account.store';
import { ChargingNowStore } from '../charging/charging-now.store';
import { HistoryStore } from '../history/history.store';
import { NearbyStore } from '../nearby/nearby.store';
import { PushRegistrar } from '../notifications/push-registrar';
import { MobileAuthService } from './mobile-auth.service';
import { SignOut } from './sign-out';

describe('SignOut', () => {
  let sessionEnded: Subject<void>;
  let router: { navigated: boolean; navigateByUrl: jest.Mock };
  let auth: { sessionEnded: Subject<void>; logout: jest.Mock; deleteLogin: jest.Mock };
  let pushes: { forget: jest.Mock };
  let stores: { clear: jest.Mock }[];
  let signOut: SignOut;

  beforeEach(() => {
    sessionEnded = new Subject<void>();
    router = { navigated: true, navigateByUrl: jest.fn(async () => true) };
    auth = { sessionEnded, logout: jest.fn(), deleteLogin: jest.fn() };
    pushes = { forget: jest.fn(async () => undefined) };
    stores = [0, 1, 2, 3].map(() => ({ clear: jest.fn() }));
    TestBed.configureTestingModule({
      providers: [
        { provide: MobileAuthService, useValue: auth },
        { provide: Router, useValue: router },
        { provide: PushRegistrar, useValue: pushes },
        { provide: AccountStore, useValue: stores[0] },
        { provide: ChargingNowStore, useValue: stores[1] },
        { provide: HistoryStore, useValue: stores[2] },
        { provide: NearbyStore, useValue: stores[3] },
      ],
    });
    signOut = TestBed.inject(SignOut);
  });

  it('signs out, forgets what it showed and goes to the welcome page', async () => {
    await signOut.run();
    expect(pushes.forget).toHaveBeenCalledWith(false);
    expect(auth.logout).toHaveBeenCalled();
    stores.forEach((store) => expect(store.clear).toHaveBeenCalled());
    expect(router.navigateByUrl).toHaveBeenCalledWith('/welcome', { replaceUrl: true });
  });

  it('leaves the open page for the welcome page when Keycloak ends the sign-in', async () => {
    signOut.listen();
    sessionEnded.next();
    await new Promise((resolve) => setTimeout(resolve));
    expect(auth.logout).not.toHaveBeenCalled();
    stores.forEach((store) => expect(store.clear).toHaveBeenCalled());
    expect(router.navigateByUrl).toHaveBeenCalledWith('/welcome', { replaceUrl: true });
  });

  it('leaves the first page to the guard when the sign-in ends at start-up', async () => {
    router.navigated = false;
    signOut.listen();
    sessionEnded.next();
    await new Promise((resolve) => setTimeout(resolve));
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
