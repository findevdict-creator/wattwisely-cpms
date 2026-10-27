import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { ManagedServiceApiService } from '../../core/api/managed-service-api.service';
import { ManagedNoticeRequest, ManagedService } from '../../core/api/models/managed-service';
import { SubscriptionApiService } from '../../core/api/subscription-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { Initials } from '../../shared/initials';
import { MoneyPipe } from '../../shared/money.pipe';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { ManagedNoticeDialogComponent } from './managed-notice-dialog.component';
import { ServiceReportComponent } from './service-report.component';

/**
 * Settings, Managed service (stories MGT-01, MGT-05): the agreement under which Wattwisely
 * runs the company's charging, who at Wattwisely works in the account, the monthly report,
 * and the Owner's two decisions: accepting the offer and ending the service with notice.
 */
@Component({
  selector: 'ww-managed-service',
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MoneyPipe,
    RouterLink,
    ServiceReportComponent,
    StatusChipComponent,
  ],
  templateUrl: './managed-service.component.html',
  styleUrl: './managed-service.component.scss',
})
export class ManagedServiceComponent implements OnInit {
  private readonly managedApi = inject(ManagedServiceApiService);
  protected readonly operatorColumns = ['name', 'email', 'since'];
  protected readonly initialsOf = Initials.of;
  private readonly subscriptionApi = inject(SubscriptionApiService);
  protected readonly permissions = inject(PermissionsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly service = signal<ManagedService | null>(null);
  protected readonly error = signal('');
  protected readonly isBusy = signal(false);
  /** The plan's currency, which the monthly fee is in. */
  protected readonly currency = signal('USD');

  async ngOnInit(): Promise<void> {
    try {
      this.service.set(await firstValueFrom(this.managedApi.get()));
      const subscription = await firstValueFrom(this.subscriptionApi.get());
      this.currency.set(subscription.plan?.currency ?? 'USD');
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  protected async accept(): Promise<void> {
    const dialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Accept the managed service?',
        message:
          'Wattwisely staff get access to your account as Managed operators from now on. ' +
          'Everything they do is marked "Wattwisely" in your audit log, and you can end the ' +
          'service at any time with 30 days’ notice.',
        confirmLabel: 'I accept the terms',
      },
    });
    if ((await firstValueFrom(dialog.afterClosed())) === true) {
      await this.change(
        () => this.managedApi.accept(),
        'Accepted. Wattwisely now runs your charging.',
      );
    }
  }

  protected async giveNotice(): Promise<void> {
    const dialog = this.dialog.open(ManagedNoticeDialogComponent, { width: '480px' });
    const request: ManagedNoticeRequest | undefined = await firstValueFrom(dialog.afterClosed());
    if (request) {
      await this.change(() => this.managedApi.giveNotice(request), 'Notice given.');
    }
  }

  private async change(call: () => Observable<ManagedService>, message: string): Promise<void> {
    this.isBusy.set(true);
    try {
      this.service.set(await firstValueFrom(call()));
      this.error.set('');
      this.snackBar.open(message, 'OK', { duration: 6000 });
      await this.permissions.reload();
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isBusy.set(false);
    }
  }
}
