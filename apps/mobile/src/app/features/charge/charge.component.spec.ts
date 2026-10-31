import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { IconRegistrar } from '@wattwisely/ui';
import { NativeScanner } from '../../core/native/native-scanner';
import { ChargeComponent } from './charge.component';

describe('ChargeComponent', () => {
  function render(scanned: string | null) {
    const scanner = { scan: jest.fn(async () => scanned) };
    TestBed.configureTestingModule({
      imports: [ChargeComponent],
      providers: [
        provideRouter([]),
        provideIonicAngular(),
        { provide: NativeScanner, useValue: scanner },
      ],
    });
    TestBed.inject(IconRegistrar).register();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ChargeComponent);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement, navigate };
  }

  it('opens the plug a QR code names', async () => {
    const { fixture, element, navigate } = render('https://charge.example.com/c/SIM-001/1');
    (element.querySelector('[data-testid="scan"]') as HTMLElement).click();
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/plug', 'SIM-001', '1']);
  });

  it('turns away a code that names no plug, and does nothing when the scanner is closed', async () => {
    const { fixture, element, navigate } = render('https://example.com/menu');
    (element.querySelector('[data-testid="scan"]') as HTMLElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(element.querySelector('[data-testid="error"]')?.textContent).toContain('not a plug');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('offers to type the code instead', () => {
    const { fixture, element } = render(null);
    expect(element.querySelector('[data-testid="code-form"]')).toBeNull();
    (element.querySelector('[data-testid="type"]') as HTMLElement).click();
    fixture.detectChanges();
    expect(element.querySelector('[data-testid="code-form"]')).not.toBeNull();
  });
});
