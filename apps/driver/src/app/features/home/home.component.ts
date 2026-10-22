import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { BrandService } from '../../core/branding/brand.service';
import { MyChargesStore } from '../../core/charges/my-charges.store';
import { ChargeWords } from '../../shared/charge-words';
import { MoneyPipe } from '../../shared/money.pipe';
import { ZonedTimePipe } from '../../shared/zoned-time.pipe';

/**
 * The home page: how to start (scan the QR code on the plug, or type what the sticker
 * says), and the charges this phone started, so the driver can get back to a receipt.
 */
@Component({
  selector: 'ww-home',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MoneyPipe,
    ReactiveFormsModule,
    RouterLink,
    ZonedTimePipe,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  protected readonly myCharges = inject(MyChargesStore);
  private readonly router = inject(Router);

  protected readonly identity = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(100)],
  });
  protected readonly plug = new FormControl('1', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{1,3}$/)],
  });
  protected readonly isFormShown = signal(false);

  /** The home page is the platform's: charges from several operators may be listed. */
  constructor() {
    inject(BrandService).reset();
  }

  protected sessionLabel(status: string): string {
    return ChargeWords.session(status);
  }

  protected open(): void {
    if (this.identity.valid && this.plug.valid) {
      void this.router.navigate(['/c', this.identity.value.trim(), this.plug.value]);
    }
  }
}
