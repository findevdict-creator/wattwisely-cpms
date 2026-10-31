import { Component, OnInit, computed, effect, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { DriverAuthService } from '../../core/auth/driver-auth.service';
import { BrandService } from '../../core/branding/brand.service';
import { Initials, PaymentModeWords } from '@wattwisely/driver-core';
import { SavedCardsComponent } from './cards/saved-cards.component';
import { AccountStore } from './account.store';

/**
 * The driver's account (module 19): the name and phone they go by, the cards they pay with,
 * their charges, the operators that know them, and the way out. The page is the platform's:
 * several operators may be listed.
 */
@Component({
  selector: 'ww-account',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    RouterLink,
    SavedCardsComponent,
  ],
  providers: [AccountStore],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent implements OnInit {
  protected readonly store = inject(AccountStore);
  protected readonly auth = inject(DriverAuthService);

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

  protected readonly initials = computed(() => {
    const me = this.store.me();
    return me ? Initials.of(me.display_name || me.email) : '';
  });

  protected initialsOf(name: string): string {
    return Initials.of(name);
  }

  protected paymentWords(mode: string): string {
    return PaymentModeWords.short(mode);
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
