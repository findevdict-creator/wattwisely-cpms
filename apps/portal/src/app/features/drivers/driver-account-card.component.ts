import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { DriverInviteResult, DriversApiService } from '../../core/api/drivers-api.service';
import { DriverDetail } from '../../core/api/models/driver';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { InviteDriverDialogComponent } from './invite-driver-dialog.component';

/**
 * The driver's own login on their page (module 19, story DRV-04): none yet, invited, or
 * linked; and with drivers:invite the way to invite, resend, cancel and unlink. Tells the
 * page when the record changed so it loads the driver again.
 */
@Component({
  selector: 'ww-driver-account-card',
  imports: [DatePipe, MatButtonModule, MatIconModule],
  templateUrl: './driver-account-card.component.html',
  styles: `
    .ww-card-body {
      gap: 12px;
    }
    .ww-kv,
    .hint {
      margin: 0;
    }
    .state {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-weight: 500;
    }
    .expired {
      color: var(--mat-sys-error);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .hint {
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class DriverAccountCardComponent {
  readonly driver = input.required<DriverDetail>();
  readonly changed = output<void>();

  protected readonly permissions = inject(PermissionsService);
  protected readonly chip = computed(() => {
    const account = this.driver().account;
    if (account.status === 'linked') {
      return { tone: 'ok', label: 'Linked' };
    }
    if (account.status === 'invited') {
      return account.is_invitation_expired
        ? { tone: 'warn', label: 'Invitation expired' }
        : { tone: 'info', label: 'Invited' };
    }
    return { tone: 'neutral', label: 'Not invited' };
  });
  private readonly driversApi = inject(DriversApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected async invite(): Promise<void> {
    const dialog = this.dialog.open(InviteDriverDialogComponent, {
      data: this.driver(),
      width: '480px',
    });
    const result: DriverInviteResult | undefined = await firstValueFrom(dialog.afterClosed());
    if (result) {
      this.tellSent(result);
      this.changed.emit();
    }
  }

  protected async resend(): Promise<void> {
    await this.attempt(async () => {
      this.tellSent(await firstValueFrom(this.driversApi.resendInvite(this.driver().id)));
    });
  }

  protected async cancel(): Promise<void> {
    await this.attempt(async () => {
      await firstValueFrom(this.driversApi.cancelInvite(this.driver().id), {
        defaultValue: undefined,
      });
      this.tell('Invitation cancelled. Its link no longer works.');
    });
  }

  protected async unlink(): Promise<void> {
    const driver = this.driver();
    const dialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: `Unlink ${driver.name}'s login?`,
        message:
          'Their login stops seeing you in the app. The record, its cards and its charges stay; you can invite them again.',
        confirmLabel: 'Unlink',
      },
    });
    if ((await firstValueFrom(dialog.afterClosed())) !== true) {
      return;
    }
    await this.attempt(async () => {
      await firstValueFrom(this.driversApi.unlink(driver), { defaultValue: undefined });
      this.tell('Login unlinked.');
    });
  }

  private async attempt(work: () => Promise<void>): Promise<void> {
    try {
      await work();
      this.changed.emit();
    } catch (error) {
      this.tell(ApiProblem.from(error).detail);
    }
  }

  private tellSent(result: DriverInviteResult): void {
    this.tell(
      result.is_email_sent
        ? 'Invitation sent.'
        : 'The invitation is saved, but the e-mail could not be sent. Try "Resend" in a moment.',
    );
  }

  private tell(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 6000 });
  }
}
