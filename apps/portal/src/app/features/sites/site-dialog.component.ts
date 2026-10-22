import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Site } from '../../core/api/models/site';
import { SitesApiService } from '../../core/api/sites-api.service';
import { OpeningHoursForm } from './opening-hours-form';
import { SiteForm } from './site-form';

/** Add a site, or change one (story AST-01). Closes with the saved site. */
@Component({
  selector: 'ww-site-dialog',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
  ],
  templateUrl: './site-dialog.component.html',
  styleUrl: './site-dialog.component.scss',
})
export class SiteDialogComponent {
  protected readonly site = inject<Site | null>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<SiteDialogComponent, Site>>(MatDialogRef);
  private readonly sitesApi = inject(SitesApiService);

  protected readonly form = this.site ? SiteForm.from(this.site) : new SiteForm();
  protected readonly timeZones = SiteForm.TIME_ZONES;
  protected readonly weekdays = OpeningHoursForm.WEEKDAYS;
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  protected async save(): Promise<void> {
    this.form.fields.markAllAsTouched();
    if (!this.form.isValid()) {
      this.error.set('Check the fields marked in red.');
      return;
    }
    this.isSaving.set(true);
    try {
      const input = this.form.toInput();
      const request = this.site
        ? this.sitesApi.update(this.site, input)
        : this.sitesApi.create(input);
      this.dialogRef.close(await firstValueFrom(request));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }
}
