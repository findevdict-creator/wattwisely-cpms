import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { KpiCardComponent, PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { ManagedServiceApiService } from '../../core/api/managed-service-api.service';
import { ServiceReport } from '../../core/api/models/managed-service';
import { TenantsApiService } from '../../core/api/tenants-api.service';
import { PageTitleService } from '../../layout/page-title.service';
import { Money } from '../../shared/money';
import { MoneyPipe } from '../../shared/money.pipe';
import { InvoiceMonths } from '../invoices/invoice-months';

/** The monthly service report of a managed tenant, as its account manager sees it (MGT-04). */
@Component({
  selector: 'ww-service-report',
  imports: [
    DatePipe,
    FormsModule,
    KpiCardComponent,
    MatTableModule,
    MoneyPipe,
    PageHeaderComponent,
  ],
  templateUrl: './service-report.component.html',
  styleUrl: './service-report.component.scss',
})
export class ServiceReportComponent implements OnInit {
  readonly id = input.required<string>();
  private readonly managedApi = inject(ManagedServiceApiService);
  private readonly tenantsApi = inject(TenantsApiService);
  private readonly pageTitle = inject(PageTitleService);

  protected readonly columns = ['charger', 'sessions', 'energy', 'revenue', 'boots', 'faults'];
  protected readonly latest = ServiceReportComponent.monthOf(new Date());
  protected month = ServiceReportComponent.previousMonth();
  protected readonly report = signal<ServiceReport | null>(null);
  protected readonly tenantName = signal('');
  protected readonly error = signal('');

  ngOnInit(): void {
    void this.load();
    void this.loadName();
  }

  protected async load(): Promise<void> {
    if (!/^\d{4}-\d{2}$/.test(this.month)) {
      return;
    }
    try {
      this.report.set(await firstValueFrom(this.managedApi.report(this.id(), this.month)));
      this.error.set('');
    } catch (error) {
      this.report.set(null);
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  /** "October 2026" for "2026-10". */
  protected monthLabel(month: string): string {
    return InvoiceMonths.label(new Date(`${month}-01T00:00:00Z`));
  }

  /** "19,870.6 kWh" for "19870.6". */
  protected kwh(energy: string): string {
    const value = Number(energy).toLocaleString('en-GB', { maximumFractionDigits: 1 });
    return `${value} kWh`;
  }

  protected money(amount: number, currency: string | null): string {
    return Money.format(amount, currency);
  }

  /** "2026-05" for the month before this one. */
  static previousMonth(now: Date = new Date()): string {
    return ServiceReportComponent.monthOf(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  }

  private static monthOf(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  /** The tenant's name, for the way back and the top bar; the report itself works without it. */
  private async loadName(): Promise<void> {
    try {
      const tenant = await firstValueFrom(this.tenantsApi.get(this.id()));
      this.tenantName.set(tenant.name);
      this.pageTitle.set(`${tenant.name}, service report`);
    } catch {
      this.pageTitle.set('Service report');
    }
  }
}
