import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { BrandService } from '../../core/branding/brand.service';
import {
  ChargeChip,
  ChargeChips,
  MoneyPipe,
  MyChargesStore,
  ZonedTimePipe,
} from '@wattwisely/driver-core';

/**
 * The home page: how to start (scan the QR code on the plug, or type what the sticker
 * says), and the charges this phone started, so the driver can get back to a receipt. The
 * form is a FormGroup so that Open, or Enter, submits it in the page.
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

  protected readonly form = new FormGroup({
    identity: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    plug: new FormControl('1', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{1,3}$/)],
    }),
  });

  /** The home page is the platform's: charges from several operators may be listed. */
  constructor() {
    inject(BrandService).reset();
  }

  protected chipOf(status: string): ChargeChip {
    return ChargeChips.session(status);
  }

  protected isUnderWay(status: string): boolean {
    return ChargeChips.isUnderWay(status);
  }

  protected open(): void {
    if (this.form.valid) {
      const { identity, plug } = this.form.getRawValue();
      void this.router.navigate(['/c', identity.trim(), plug]);
    }
  }
}
