import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { EmptyStateComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { ReportSchedule } from '../../core/api/models/report';
import { Site } from '../../core/api/models/site';
import { ReportsApiService } from '../../core/api/reports-api.service';
import { SitesApiService } from '../../core/api/sites-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { ScheduleDialogComponent, ScheduleDialogData } from './schedule-dialog.component';

/** Scheduled reports (advanced_reports): a usage CSV e-mailed every Monday or on the 1st. */
@Component({
  selector: 'ww-report-schedules',
  imports: [DatePipe, EmptyStateComponent, MatButtonModule, MatIconModule, MatTableModule],
  templateUrl: './report-schedules.component.html',
  styles: `
    .buttons {
      display: inline-flex;
    }
  `,
})
export class ReportSchedulesComponent implements OnInit {
  private readonly reportsApi = inject(ReportsApiService);
  private readonly sitesApi = inject(SitesApiService);
  private readonly dialog = inject(MatDialog);
  protected readonly permissions = inject(PermissionsService);

  protected readonly columns = ['name', 'recipients', 'next_run', 'actions'];
  protected readonly schedules = signal<ReportSchedule[]>([]);
  private readonly sites = signal<Site[]>([]);
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    void firstValueFrom(this.sitesApi.list())
      .then((page) => this.sites.set(page.items))
      .catch(() => this.sites.set([]));
    await this.load();
  }

  protected async edit(schedule: ReportSchedule | null): Promise<void> {
    const data: ScheduleDialogData = { schedule, sites: this.sites() };
    const ref = this.dialog.open(ScheduleDialogComponent, { data, width: '520px' });
    if (await firstValueFrom(ref.afterClosed())) {
      await this.load();
    }
  }

  protected async remove(schedule: ReportSchedule): Promise<void> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Stop this report?',
        message: `${schedule.name} will no longer be sent.`,
        confirmLabel: 'Delete',
      },
    });
    if (!(await firstValueFrom(ref.afterClosed()))) {
      return;
    }
    try {
      await firstValueFrom(this.reportsApi.deleteSchedule(schedule.id));
      await this.load();
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  private async load(): Promise<void> {
    try {
      this.schedules.set((await firstValueFrom(this.reportsApi.schedules())).items);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}
