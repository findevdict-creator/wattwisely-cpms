import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { PaymentAccount } from '../../core/api/models/payment';
import { PaymentsApiService } from '../../core/api/payments-api.service';

/** Opens the company's Stripe Express account; closes with it, then onboarding follows. */
@Component({
  selector: 'ww-connect-stripe-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Connect Stripe</h2>
    <mat-dialog-content>
      <p>
        Drivers' card payments go straight to your company's own Stripe account. Stripe will ask for
        your company details and bank account next.
      </p>
      <mat-form-field appearance="outline">
        <mat-label>Country of registration (two letters)</mat-label>
        <input matInput [formControl]="country" maxlength="2" data-testid="stripe-country" />
      </mat-form-field>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Not now</button>
      <button mat-flat-button (click)="connect()" [disabled]="isSaving()" data-testid="confirm">
        Connect and continue in Stripe
      </button>
    </mat-dialog-actions>
  `,
})
export class ConnectStripeDialogComponent {
  private readonly dialogRef =
    inject<MatDialogRef<ConnectStripeDialogComponent, PaymentAccount | null>>(MatDialogRef);
  private readonly paymentsApi = inject(PaymentsApiService);

  protected readonly country = new FormControl('GB', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)],
  });
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  protected async connect(): Promise<void> {
    if (this.country.invalid) {
      this.error.set('Enter the two-letter country code, e.g. GB.');
      return;
    }
    this.isSaving.set(true);
    try {
      const account = await firstValueFrom(
        this.paymentsApi.connect(this.country.value.toUpperCase()),
      );
      this.dialogRef.close(account);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }
}
