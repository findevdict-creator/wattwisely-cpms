import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { DriverInviteResult, DriversApiService } from '../../core/api/drivers-api.service';
import { DriverDetail } from '../../core/api/models/driver';

/**
 * Invites a driver to the app (module 19, story DRV-04): an e-mail with a link that ties
 * their own login to this record. Closes with the API's answer.
 */
@Component({
  selector: 'ww-invite-driver-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Invite {{ driver.name }} to the app</h2>
    <mat-dialog-content>
      <p class="hint">
        The driver gets an e-mail with a link. Once they log in with that address, they see their
        cards and charges with you in the app, and can pay with a saved card.
      </p>
      <form (ngSubmit)="send()">
        <mat-form-field appearance="outline" class="wide">
          <mat-label>Send to</mat-label>
          <input matInput [formControl]="email" type="email" data-testid="invite-email" />
          <mat-error>Enter a valid e-mail address</mat-error>
          @if (driver.is_personal_data_hidden) {
            <mat-hint>You cannot see the driver's address; type the one to invite</mat-hint>
          }
        </mat-form-field>
      </form>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Cancel</button>
      <button mat-flat-button (click)="send()" [disabled]="isSending()" data-testid="send-invite">
        Send invitation
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .wide {
      width: 100%;
      margin-top: 8px;
    }
    .hint {
      color: var(--mat-sys-on-surface-variant);
      margin-top: 0;
    }
  `,
})
export class InviteDriverDialogComponent {
  protected readonly driver = inject<DriverDetail>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<InviteDriverDialogComponent, DriverInviteResult>>(MatDialogRef);
  private readonly driversApi = inject(DriversApiService);

  protected readonly email = new FormControl(this.driver.email ?? '', {
    nonNullable: true,
    validators: [Validators.required, Validators.email, Validators.maxLength(254)],
  });
  protected readonly error = signal('');
  protected readonly isSending = signal(false);

  protected async send(): Promise<void> {
    this.email.markAsTouched();
    if (this.email.invalid) {
      return;
    }
    this.isSending.set(true);
    try {
      const address = this.email.value.trim();
      const result = await firstValueFrom(
        this.driversApi.invite(this.driver.id, address === this.driver.email ? null : address),
      );
      this.dialogRef.close(result);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSending.set(false);
    }
  }
}
