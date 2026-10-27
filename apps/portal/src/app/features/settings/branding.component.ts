import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { BrandingApiService } from '../../core/api/branding-api.service';
import { Branding, PublicBranding } from '../../core/api/models/branding';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { Initials } from '../../shared/initials';
import { BrandColour } from './brand-colour';
import { BrandPreviewComponent } from './brand-preview.component';
import { BrandingForm } from './branding-form';
import { LogoFileReader } from './logo-file.reader';

/**
 * Settings, Branding: the name, colours, logo and support contact drivers see on the QR
 * charge page, in e-mails and on receipts (white-labelling design, "Branded" level).
 * A preview follows the fields as they are typed; the logo is uploaded on its own.
 */
@Component({
  selector: 'ww-branding',
  imports: [
    BrandPreviewComponent,
    DecimalPipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './branding.component.html',
  styleUrl: './branding.component.scss',
})
export class BrandingComponent implements OnInit {
  static readonly ACCEPTED_FILES = Object.keys(LogoFileReader.TYPES).join(',');

  protected readonly permissions = inject(PermissionsService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly brandingApi = inject(BrandingApiService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly acceptedFiles = BrandingComponent.ACCEPTED_FILES;
  protected readonly branding = signal<Branding | null>(null);
  protected readonly form = new BrandingForm();
  protected readonly error = signal('');
  protected readonly isBusy = signal(false);
  protected readonly canEdit = computed(() => this.permissions.canChange('settings:write'));
  private readonly typed = toSignal(this.form.fields.valueChanges);
  protected readonly preview = computed<PublicBranding | null>(() => {
    const saved = this.branding();
    this.typed();
    return saved
      ? this.form.preview(saved.preview, this.tenantContext.currentTenant()?.name ?? '')
      : null;
  });

  protected readonly contrastNote = computed(() => {
    const brand = this.preview();
    return brand ? BrandColour.contrastNote(brand.primary_color, brand.on_primary_color) : '';
  });
  protected readonly initials = computed(() =>
    Initials.of(this.preview()?.name || this.tenantContext.currentTenant()?.name || 'W'),
  );

  ngOnInit(): void {
    if (!this.canEdit()) {
      this.form.fields.disable();
    }
    void this.run(async () => this.show(await firstValueFrom(this.brandingApi.get()), true));
  }

  protected async save(): Promise<void> {
    const saved = this.branding();
    if (!saved || !this.form.isValid()) {
      return;
    }
    await this.run(async () => {
      const request = this.form.toRequest();
      this.show(await firstValueFrom(this.brandingApi.update(request, saved.version)), true);
      this.snackBar.open('Branding saved.', 'OK', { duration: 6000 });
    });
  }

  protected async chooseLogo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const saved = this.branding();
    input.value = '';
    if (!file || !saved) {
      return;
    }
    await this.run(async () => {
      const logo = await LogoFileReader.read(file);
      this.show(await firstValueFrom(this.brandingApi.uploadLogo(logo, saved.version)));
      this.snackBar.open('Logo uploaded.', 'OK', { duration: 6000 });
    });
  }

  protected async removeLogo(): Promise<void> {
    const saved = this.branding();
    if (!saved) {
      return;
    }
    await this.run(async () => {
      this.show(await firstValueFrom(this.brandingApi.removeLogo(saved.version)));
      this.snackBar.open('Logo removed.', 'OK', { duration: 6000 });
    });
  }

  /** After a load or a save the fields show what is saved; after a logo change they keep what was typed. */
  private show(branding: Branding, isFillingFields = false): void {
    this.branding.set(branding);
    if (isFillingFields) {
      this.form.fill(branding);
    }
  }

  private async run(work: () => Promise<void>): Promise<void> {
    this.isBusy.set(true);
    try {
      await work();
      this.error.set('');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : ApiProblem.from(error).detail);
    } finally {
      this.isBusy.set(false);
    }
  }
}
