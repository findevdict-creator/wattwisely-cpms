import { Component, OnInit, effect, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { DriverAuthService } from '../../core/auth/driver-auth.service';
import { BrandService } from '../../core/branding/brand.service';
import { AccountStore } from './account.store';

/**
 * "Personal details" (module 38, from the account page of module 19): the name and phone the
 * driver gives themselves, kept by the API. The e-mail and the password are Keycloak's,
 * changed on its own page. An operator keeps its own record of the driver, untouched here.
 */
@Component({
  selector: 'ww-details',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  providers: [AccountStore],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss',
})
export class DetailsComponent implements OnInit {
  protected readonly store = inject(AccountStore);
  protected readonly accountUrl = inject(DriverAuthService).accountUrl();

  protected readonly form = new FormGroup({
    display_name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(40)] }),
  });

  constructor() {
    inject(BrandService).reset();
    effect(() => {
      const me = this.store.me();
      if (me) {
        this.form.reset({ display_name: me.display_name, phone: me.phone ?? '' });
      }
    });
  }

  ngOnInit(): void {
    void this.store.load();
  }

  protected save(): void {
    if (this.form.valid) {
      const value = this.form.getRawValue();
      void this.store.save({
        display_name: value.display_name.trim(),
        phone: value.phone.trim() || null,
      });
    }
  }
}
