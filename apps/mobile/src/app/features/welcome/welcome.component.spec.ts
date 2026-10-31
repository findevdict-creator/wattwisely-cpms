import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { IconRegistrar } from '@wattwisely/ui';
import { MobileAuthService } from '../../core/auth/mobile-auth.service';
import { WelcomeComponent } from './welcome.component';

describe('WelcomeComponent', () => {
  it('opens sign-up or sign-in, and goes home once the driver is signed in', async () => {
    const auth = { hasSession: signal(false), login: jest.fn() };
    TestBed.configureTestingModule({
      imports: [WelcomeComponent],
      providers: [
        provideRouter([]),
        provideIonicAngular(),
        { provide: MobileAuthService, useValue: auth },
      ],
    });
    TestBed.inject(IconRegistrar).register();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(WelcomeComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    (element.querySelector('[data-testid="create-account"]') as HTMLElement).click();
    expect(auth.login).toHaveBeenCalledWith(true);
    (element.querySelector('[data-testid="sign-in"]') as HTMLElement).click();
    expect(auth.login).toHaveBeenLastCalledWith();
    expect(navigate).not.toHaveBeenCalled();

    auth.hasSession.set(true);
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith('/tabs/home', { replaceUrl: true });
  });

  it('comes back to the page a link asked for, and only to a page of the app', () => {
    expect(WelcomeComponent.target('/plug/SIM-001/1')).toBe('/plug/SIM-001/1');
    expect(WelcomeComponent.target(undefined)).toBe('/tabs/home');
    expect(WelcomeComponent.target('//evil.example.com')).toBe('/tabs/home');
    expect(WelcomeComponent.target('https://evil.example.com')).toBe('/tabs/home');
  });
});
