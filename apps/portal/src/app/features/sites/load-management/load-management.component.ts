import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../../core/api/api-problem';
import { LoadManagementApiService } from '../../../core/api/load-management-api.service';
import { LoadCharger, LoadManagement } from '../../../core/api/models/load-management';
import { PermissionsService } from '../../../core/permissions/permissions.service';
import { StatusChipComponent } from '../../../shared/status-chip.component';
import { LoadChargerGroup, LoadManagementForm } from './load-management-form';

/** A site's load management (module 17): the cap, how it is shared, and what each charger holds. */
@Component({
  selector: 'ww-load-management',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTableModule,
    MatTooltipModule,
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
  private readonly snackBar = inject(MatSnackBar);

  protected readonly columns = ['charger', 'priority', 'max_power', 'allocated', 'state'];
  protected readonly strategies = LoadManagementForm.STRATEGIES;
  protected readonly view = signal<LoadManagement | null>(null);
  protected readonly form = signal<LoadManagementForm>(new LoadManagementForm());
  protected readonly isSaving = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    void this.load();
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

  private apply(view: LoadManagement): void {
    this.view.set(view);
    this.form.set(LoadManagementForm.of(view));
    this.error.set('');
  }
}
