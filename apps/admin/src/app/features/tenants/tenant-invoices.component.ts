import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { InvoicesApiService } from '../../core/api/invoices-api.service';
import { InvoiceSummary } from '../../core/api/models/invoice';
import { Tenant } from '../../core/api/models/tenant';
import { StaffContextService } from '../../core/staff/staff-context.service';
import { DraftInvoiceDialogComponent } from '../invoices/draft-invoice-dialog.component';
import { MoneyPipe } from '../../shared/money.pipe';
import { StatusChipComponent } from '../../shared/status-chip.component';

/** The "Invoices" card of a tenant (module 15): its latest invoices, and a draft by hand. */
@Component({
  selector: 'ww-tenant-invoices',
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MoneyPipe,
    RouterLink,
    StatusChipComponent,
  ],
  templateUrl: './tenant-invoices.component.html',
  styleUrl: './tenant-invoices.component.scss',
})
export class TenantInvoicesComponent implements OnInit {
  static readonly SHOWN = 6;

  readonly tenant = input.required<Tenant>();
  protected readonly staff = inject(StaffContextService);
  private readonly invoicesApi = inject(InvoicesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly columns = ['invoice', 'total', 'due', 'status'];
  protected readonly invoices = signal<InvoiceSummary[]>([]);
  protected readonly isLoaded = signal(false);
  protected readonly error = signal('');
  protected readonly canDraft = computed(
    () => this.staff.can('billing:write') && this.tenant().status !== 'cancelled',
  );
  protected readonly shown = computed(() =>
    this.invoices().slice(0, TenantInvoicesComponent.SHOWN),
  );

  ngOnInit(): void {
    void this.load();
  }

  protected async draft(): Promise<void> {
    const dialog = this.dialog.open(DraftInvoiceDialogComponent, {
      data: { tenantName: this.tenant().name },
      width: '480px',
    });
    const month: string | undefined = await firstValueFrom(dialog.afterClosed());
    if (!month) {
      return;
    }
    try {
      const invoice = await firstValueFrom(this.invoicesApi.create(this.tenant().id, month));
      this.snackBar.open(`Draft for ${invoice.month_label} ready to check.`, 'OK', {
        duration: 6000,
      });
      await this.router.navigate(['/invoices', invoice.id]);
    } catch (error) {
      this.snackBar.open(ApiProblem.from(error).detail, 'OK', { duration: 8000 });
    }
  }

  protected statusOf(invoice: InvoiceSummary): string {
    return invoice.is_overdue ? 'overdue' : invoice.status;
  }

  private async load(): Promise<void> {
    try {
      const page = await firstValueFrom(this.invoicesApi.list({ tenant_id: this.tenant().id }));
      this.invoices.set(page.items);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isLoaded.set(true);
    }
  }
}
