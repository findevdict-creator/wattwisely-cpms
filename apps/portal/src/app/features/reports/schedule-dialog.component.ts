import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable, firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { ReportSchedule } from '../../core/api/models/report';
import { Site } from '../../core/api/models/site';
import { ReportsApiService } from '../../core/api/reports-api.service';
import { QuietHours } from '../../layout/quiet-hours';
import { ScheduleForm } from './schedule-form';

/** What the schedule dialog edits: an existing schedule or a new one, and the sites to pick from. */
export interface ScheduleDialogData {
  schedule: ReportSchedule | null;
  sites: Site[];
}

/** A usage report e-mailed every Monday or on the 1st of the month (advanced_reports). */
@Component({
  selector: 'ww-schedule-dialog',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './schedule-dialog.component.html',
  styles: `
    .wide {
      width: 100%;
    }
    .row {
      display: flex;
      gap: 12px;
    }
  `,
})
export class ScheduleDialogComponent {
  protected readonly data = inject<ScheduleDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ScheduleDialogComponent, boolean>>(MatDialogRef);
  private readonly reportsApi = inject(ReportsApiService);

  private readonly initial = ScheduleForm.initial(this.data.schedule, QuietHours.browserTimeZone());
  protected readonly form = new FormGroup({
    name: new FormControl(this.initial.name, { nonNullable: true }),
    frequency: new FormControl(this.initial.frequency, { nonNullable: true }),
    groupBy: new FormControl(this.initial.group_by, { nonNullable: true }),
    siteId: new FormControl(this.initial.site_id),
    recipients: new FormControl(this.initial.recipients.join(', '), { nonNullable: true }),
    timeZone: new FormControl(this.initial.time_zone, { nonNullable: true }),
    isActive: new FormControl(this.initial.is_active, { nonNullable: true }),
  });
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  protected async save(): Promise<void> {
    const value = this.form.getRawValue();
    const recipients = ScheduleForm.recipients(value.recipients);
    const problem = ScheduleForm.problem(value.name, recipients);
    if (problem) {
      this.error.set(problem);
      return;
    }
    const request = {
      name: value.name.trim(),
      frequency: value.frequency,
      group_by: value.groupBy,
      site_id: value.siteId,
      recipients,
      time_zone: value.timeZone.trim(),
      is_active: value.isActive,
    };
    const schedule = this.data.schedule;
    await this.send(
      schedule
        ? this.reportsApi.updateSchedule(schedule, request)
        : this.reportsApi.createSchedule(request),
    );
  }

  private async send(call: Observable<ReportSchedule>): Promise<void> {
    this.isSaving.set(true);
    try {
      await firstValueFrom(call);
      this.dialogRef.close(true);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }
}
