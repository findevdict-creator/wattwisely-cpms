import { Component, inject, input } from '@angular/core';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ReportExportsComponent } from './report-exports.component';
import { ReportSchedulesComponent } from './report-schedules.component';
import { UsageReportComponent } from './usage-report.component';

/**
 * Reports (module 11): the usage report for those with reports:read, the caller's
 * background exports for everyone who can make one, and scheduled reports on plans with
 * advanced_reports. /reports?export={id} is where an "export ready" e-mail points.
 */
@Component({
  selector: 'ww-reports',
  imports: [ReportExportsComponent, ReportSchedulesComponent, UsageReportComponent],
  template: `
    <h1>Reports</h1>
    @if (permissions.can('reports:read')) {
      <section><ww-usage-report /></section>
    }
    <section><ww-report-exports [highlight]="export()" /></section>
    @if (permissions.can('reports:schedule') && !permissions.isModuleLocked('advanced_reports')) {
      <section><ww-report-schedules /></section>
    } @else if (permissions.can('reports:read') && permissions.isModuleLocked('advanced_reports')) {
      <section data-testid="schedules-locked">
        <h2>Scheduled reports</h2>
        <p class="hint">
          Reports e-mailed every week or month come with Advanced reports, on the Growth and
          Enterprise plans. Ask Wattwisely to add it.
        </p>
      </section>
    }
  `,
  styles: `
    section {
      margin-bottom: 32px;
    }
  `,
})
export class ReportsComponent {
  /** From the query string: the export an e-mail linked to. */
  readonly export = input<string>();

  protected readonly permissions = inject(PermissionsService);
}
