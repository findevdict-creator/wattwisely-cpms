import { Component, inject, input, linkedSignal } from '@angular/core';
import { PageHeaderComponent } from '@wattwisely/ui';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ReportExportsComponent } from './report-exports.component';
import { ReportSchedulesComponent } from './report-schedules.component';
import { UsageReportComponent } from './usage-report.component';

type ReportTab = 'usage' | 'exports' | 'schedules';

/**
 * Reports (module 11): the usage report for those with reports:read, the caller's
 * background exports for everyone who can make one, and scheduled reports on plans with
 * advanced_reports. /reports?export={id} is where an "export ready" e-mail points, and
 * ?tab=exports where the pages that start an export send people.
 */
@Component({
  selector: 'ww-reports',
  imports: [
    PageHeaderComponent,
    ReportExportsComponent,
    ReportSchedulesComponent,
    UsageReportComponent,
  ],
  templateUrl: './reports.component.html',
})
export class ReportsComponent {
  /** From the query string: the export an e-mail linked to. */
  readonly export = input<string>();
  /** From the query string: the tab to open on. */
  readonly tab = input<string>();

  protected readonly permissions = inject(PermissionsService);
  protected readonly shown = linkedSignal<ReportTab>(() => {
    if (this.export() || this.tab() === 'exports' || !this.permissions.can('reports:read')) {
      return 'exports';
    }
    return this.tab() === 'schedules' ? 'schedules' : 'usage';
  });

  protected canSchedule(): boolean {
    return (
      this.permissions.can('reports:schedule') &&
      !this.permissions.isModuleLocked('advanced_reports')
    );
  }

  protected isScheduleLocked(): boolean {
    return (
      this.permissions.can('reports:read') && this.permissions.isModuleLocked('advanced_reports')
    );
  }
}
