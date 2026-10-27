import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent, KpiCardComponent, PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../../core/api/api-problem';
import { LoadManagementApiService } from '../../../core/api/load-management-api.service';
import { LoadCharger, LoadManagement } from '../../../core/api/models/load-management';
import { SitesApiService } from '../../../core/api/sites-api.service';
import { PermissionsService } from '../../../core/permissions/permissions.service';
import { StatusChipComponent } from '../../../shared/status-chip.component';
import { LoadFigures } from './load-figures';
import { LoadChargerGroup, LoadManagementForm } from './load-management-form';

/** A site's load management (module 17): the cap, how it is shared, and what each charger holds. */
@Component({
  selector: 'ww-load-management',
  imports: [
    DatePipe,
    EmptyStateComponent,
    KpiCardComponent,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatTableModule,
    MatTooltipModule,
    PageHeaderComponent,
    RouterLink,
    StatusChipComponent,
  ],
  templateUrl: './load-management.component.html',
  styleUrl: './load-management.component.scss',
})
export class LoadManagementComponent implements OnInit {
  static readonly REASONS: Record<string, string> = {
    share: 'Sharing the cap',
    minimum: 'At its minimum',
    idle: 'Reserve while idle',
    waiting: 'Waiting for room',
    squeezed: 'Squeezed under the cap',
  };

  readonly id = input.required<string>();
  protected readonly permissions = inject(PermissionsService);
  private readonly api = inject(LoadManagementApiService);
  private readonly sitesApi = inject(SitesApiService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly columns = ['charger', 'status', 'priority', 'max_power', 'allocated', 'state'];
  protected readonly strategies = LoadManagementForm.STRATEGIES;
  protected readonly view = signal<LoadManagement | null>(null);
  protected readonly form = signal<LoadManagementForm>(new LoadManagementForm());
  protected readonly isSaving = signal(false);
  protected readonly error = signal('');
  protected readonly siteName = signal('');
  protected readonly figures = computed(() => {
    const view = this.view();
    return view ? LoadFigures.of(view) : null;
  });

  ngOnInit(): void {
    void this.load();
    void this.loadSiteName();
  }

  protected isLocked(): boolean {
    return this.permissions.isModuleLocked('load_management');
  }

  protected canWrite(): boolean {
    return this.permissions.canChange('load_management:write') && !this.isLocked();
  }

  protected row(index: number): LoadChargerGroup {
    return this.form().chargers.at(index);
  }

  protected shareOf(charger: LoadCharger): number {
    return LoadFigures.shareOf(charger, this.view()?.policy.limit_kw ?? 0);
  }

  protected reasonOf(charger: LoadCharger): string {
    return charger.reason ? LoadManagementComponent.REASONS[charger.reason] : '';
  }

  protected stateOf(charger: LoadCharger): string {
    if (charger.allocated_kw === null) {
      return 'No cap yet';
    }
    if (charger.last_error) {
      return `Not accepted: ${charger.last_error}`;
    }
    return charger.is_applied ? 'Cap applied' : 'Sending the cap';
  }

  protected async save(): Promise<void> {
    const view = this.view();
    const form = this.form();
    if (!view || !form.isValid()) {
      return;
    }
    this.isSaving.set(true);
    try {
      this.apply(
        await firstValueFrom(this.api.save(this.id(), view.policy.version, form.toInput())),
      );
      this.snackBar.open(
        'Load management saved. The chargers get their caps within seconds.',
        'OK',
        {
          duration: 5000,
        },
      );
    } catch (error) {
      this.snackBar.open(ApiProblem.from(error).detail, 'OK', { duration: 6000 });
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async refresh(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      this.apply(await firstValueFrom(this.api.get(this.id())));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  /** The site's name, for the way back. */
  private async loadSiteName(): Promise<void> {
    try {
      this.siteName.set((await firstValueFrom(this.sitesApi.get(this.id()))).name);
    } catch {
      this.siteName.set('');
    }
  }

  private apply(view: LoadManagement): void {
    this.view.set(view);
    this.form.set(LoadManagementForm.of(view));
    this.error.set('');
  }
}
