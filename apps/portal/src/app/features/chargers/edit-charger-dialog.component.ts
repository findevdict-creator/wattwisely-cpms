import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { ChargersApiService } from '../../core/api/chargers-api.service';
import { Charger } from '../../core/api/models/charger';
import { Site, SiteVisibility } from '../../core/api/models/site';
import { SitesApiService } from '../../core/api/sites-api.service';

/** Change a charger's site, vendor, model, visibility and plain-ws setting (story AST-02). */
@Component({
  selector: 'ww-edit-charger-dialog',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './edit-charger-dialog.component.html',
})
export class EditChargerDialogComponent implements OnInit {
  protected readonly charger = inject<Charger>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<EditChargerDialogComponent, Charger>>(MatDialogRef);
  private readonly chargersApi = inject(ChargersApiService);
  private readonly sitesApi = inject(SitesApiService);

  protected readonly form = new FormGroup({
    siteId: new FormControl(this.charger.site_id, { nonNullable: true }),
    vendor: new FormControl(this.charger.vendor ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(100)],
    }),
    model: new FormControl(this.charger.model ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(100)],
    }),
    visibilityOverride: new FormControl<SiteVisibility | ''>(
      this.charger.visibility_override ?? '',
      { nonNullable: true },
    ),
    allowPlainWs: new FormControl(this.charger.allow_plain_ws, { nonNullable: true }),
  });
  protected readonly sites = signal<Site[]>([]);
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  ngOnInit(): void {
    void this.loadSites();
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.error.set('Check the fields marked in red.');
      return;
    }
    this.isSaving.set(true);
    try {
      const value = this.form.getRawValue();
      const request = this.chargersApi.update(this.charger, {
        site_id: value.siteId,
        vendor: value.vendor.trim() || null,
        model: value.model.trim() || null,
        visibility_override: value.visibilityOverride || null,
        allow_plain_ws: value.allowPlainWs,
      });
      this.dialogRef.close(await firstValueFrom(request));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }

  private async loadSites(): Promise<void> {
    try {
      this.sites.set((await firstValueFrom(this.sitesApi.list())).items);
    } catch {
      this.sites.set([]);
    }
  }
}
