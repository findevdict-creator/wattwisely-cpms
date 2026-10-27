import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { ChargeNotifications } from '../../core/api/models/charge-notifications';
import { PublicApiService } from '../../core/api/public-api.service';

/**
 * E-mail updates about this charge (story NTF-01): the receipt once an address is given,
 * and, if the driver wants them, when charging starts, nears full, finishes, and five
 * minutes before an idle fee. No account needed.
 */
@Component({
  selector: 'ww-charge-updates',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './charge-updates.component.html',
  styleUrl: './charge-updates.component.scss',
})
export class ChargeUpdatesComponent implements OnInit {
  readonly key = input.required<string>();

  private readonly publicApi = inject(PublicApiService);

  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(254)],
    }),
    started: new FormControl(true, { nonNullable: true }),
    nearly_full: new FormControl(true, { nonNullable: true }),
    finished: new FormControl(true, { nonNullable: true }),
    idle_warning: new FormControl(true, { nonNullable: true }),
  });
  protected readonly saved = signal<ChargeNotifications | null>(null);
  protected readonly isEditing = signal(false);
  protected readonly isBusy = signal(false);
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      this.show(await firstValueFrom(this.publicApi.notifications(this.key())));
    } catch {
      // The card is optional: without it the charge page works as before.
    }
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    await this.run(async () => {
      const value = this.form.getRawValue();
      const request = { ...value, email: value.email.trim() };
      this.show(await firstValueFrom(this.publicApi.saveNotifications(this.key(), request)));
    });
  }

  protected async stop(): Promise<void> {
    await this.run(async () => {
      await firstValueFrom(this.publicApi.stopNotifications(this.key()));
      this.saved.set(null);
      this.form.reset();
      this.isEditing.set(false);
    });
  }

  protected edit(): void {
    this.isEditing.set(true);
  }

  private show(notifications: ChargeNotifications): void {
    const { email, is_undeliverable: isUndeliverable, ...wanted } = notifications;
    this.form.setValue({ email: email ?? '', ...wanted });
    this.saved.set(email ? notifications : null);
    this.isEditing.set(email === null || isUndeliverable);
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.isBusy.set(true);
    this.error.set('');
    try {
      await action();
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isBusy.set(false);
    }
  }
}
