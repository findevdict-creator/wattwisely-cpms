import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { ManagedServiceApiService } from '../../core/api/managed-service-api.service';
import { ServiceReport } from '../../core/api/models/managed-service';
import { MoneyPipe } from '../../shared/money.pipe';

/** The monthly service report of a managed tenant, as its account manager sees it (MGT-04). */
@Component({
  selector: 'ww-service-report',
  imports: [
    DatePipe,
    FormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTableModule,
    MoneyPipe,
    RouterLink,
  ],
  templateUrl: './service-report.component.html',
  styleUrl: './service-report.component.scss',
})
export class ServiceReportComponent implements OnInit {
  readonly id = input.required<string>();
  private readonly managedApi = inject(ManagedServiceApiService);

  protected readonly columns = ['charger', 'sessions', 'energy', 'revenue', 'boots', 'faults'];
  protected readonly latest = ServiceReportComponent.monthOf(new Date());
  protected month = ServiceReportComponent.previousMonth();
  protected readonly report = signal<ServiceReport | null>(null);
  protected readonly error = signal('');

  ngOnInit(): void {
    void this.load();
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

  /** "2026-05" for the month before this one. */
  static previousMonth(now: Date = new Date()): string {
    return ServiceReportComponent.monthOf(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  }

  private static monthOf(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}
