import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { ChargersApiService } from '../../core/api/chargers-api.service';
import { ChargerAuthMode, RegisteredCharger } from '../../core/api/models/charger';
import { Site } from '../../core/api/models/site';
import { SitesApiService } from '../../core/api/sites-api.service';
import { SetupCardComponent } from './setup-card.component';

/** Where the dialog starts: on a site page the site is already chosen. */
export interface RegisterChargerData {
  siteId?: string;
}

/**
 * The register-charger wizard (story AST-02): site, identity, security, then the setup card.
 * Closes with the registered charger once the person has copied the card.
 */
@Component({
  selector: 'ww-register-charger-dialog',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    ReactiveFormsModule,
    SetupCardComponent,
  ],
  templateUrl: './register-charger-dialog.component.html',
  styleUrl: './register-charger-dialog.component.scss',
})
export class RegisterChargerDialogComponent implements OnInit {
  static readonly IDENTITY = /^[A-Za-z0-9._-]{1,48}$/;

  private readonly data = inject<RegisterChargerData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<RegisterChargerDialogComponent, RegisteredCharger>>(MatDialogRef);
  private readonly chargersApi = inject(ChargersApiService);
  private readonly sitesApi = inject(SitesApiService);

  protected readonly form = new FormGroup({
    siteId: new FormControl(this.data.siteId ?? '', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    identityMode: new FormControl<'generate' | 'existing'>('generate', { nonNullable: true }),
    identity: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(RegisterChargerDialogComponent.IDENTITY)],
    }),
    authMode: new FormControl<ChargerAuthMode>('password', { nonNullable: true }),
    vendor: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    model: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    allowPlainWs: new FormControl(false, { nonNullable: true }),
  });
  protected readonly sites = signal<Site[]>([]);
  protected readonly result = signal<RegisteredCharger | null>(null);
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  ngOnInit(): void {
    void this.loadSites();
  }

  protected isWeakIdentity(): boolean {
    const { identityMode, identity, authMode } = this.form.getRawValue();
    return identityMode === 'existing' && authMode === 'none' && identity.trim().length < 10;
  }

  protected async register(): Promise<void> {
    const value = this.form.getRawValue();
    const isIdentityMissing = value.identityMode === 'existing' && !value.identity.trim();
    this.form.markAllAsTouched();
    if (this.form.invalid || isIdentityMissing) {
      this.error.set('Check the fields marked in red.');
      return;
    }
    this.isSaving.set(true);
    try {
      const request = this.chargersApi.register({
        site_id: value.siteId,
        identity_mode: value.identityMode,
        ...(value.identityMode === 'existing' ? { identity: value.identity.trim() } : {}),
        auth_mode: value.authMode,
        ...(value.vendor.trim() ? { vendor: value.vendor.trim() } : {}),
        ...(value.model.trim() ? { model: value.model.trim() } : {}),
        allow_plain_ws: value.allowPlainWs,
      });
      this.result.set(await firstValueFrom(request));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }

  protected done(): void {
    this.dialogRef.close(this.result() ?? undefined);
  }

  private async loadSites(): Promise<void> {
    try {
      this.sites.set((await firstValueFrom(this.sitesApi.list())).items);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}
