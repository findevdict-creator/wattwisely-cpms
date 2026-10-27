import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { ManagedServiceApiService } from '../../core/api/managed-service-api.service';
import { ServiceReport } from '../../core/api/models/service-report';
import { MoneyPipe } from '../../shared/money.pipe';
import { ReportMonth } from './report-month';

/**
 * The monthly service report (story MGT-04): what the chargers did and earned, what
 * Wattwisely changed, and what the report cannot show yet.
 */
@Component({
  selector: 'ww-service-report',
  imports: [DatePipe, FormsModule, MatTableModule, MoneyPipe],
  templateUrl: './service-report.component.html',
  styleUrl: './service-report.component.scss',
})
export class ServiceReportComponent implements OnInit {
  private readonly managedApi = inject(ManagedServiceApiService);

  protected readonly columns = ['charger', 'sessions', 'energy', 'revenue', 'boots', 'faults'];
  protected readonly latest = ReportMonth.current();
  protected month = ReportMonth.previous();
  protected readonly report = signal<ServiceReport | null>(null);
  protected readonly error = signal('');
  protected readonly monthLabel = ReportMonth.label;

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    if (!/^\d{4}-\d{2}$/.test(this.month)) {
      return;
    }
    try {
      this.report.set(await firstValueFrom(this.managedApi.report(this.month)));
      this.error.set('');
    } catch (error) {
      this.report.set(null);
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}
