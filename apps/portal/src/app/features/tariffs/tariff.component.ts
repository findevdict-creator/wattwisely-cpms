import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { TariffBandsComponent } from './tariff-bands.component';
import { TariffEditorStore } from './tariff-editor.store';
import { TariffPreviewComponent } from './tariff-preview.component';

/** A new tariff, or one tariff: its prices, bands, a cost preview and the price history. */
@Component({
  selector: 'ww-tariff',
  imports: [
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
    RouterLink,
    TariffBandsComponent,
    TariffPreviewComponent,
  ],
  providers: [TariffEditorStore],
  templateUrl: './tariff.component.html',
  styleUrl: './tariff.component.scss',
})
export class TariffComponent implements OnInit {
  /** The tariff id from the route; none on /tariffs/new. */
  readonly id = input<string>();
  protected readonly store = inject(TariffEditorStore);
  protected readonly permissions = inject(PermissionsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly error = signal('');
  protected readonly isSaving = signal(false);
  protected readonly isEditable = computed(
    () => this.permissions.canChange('tariffs:write') && this.store.tariff()?.status !== 'archived',
  );

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      this.store.load(id, this.isEditable()).catch((error) => this.fail(error));
    }
  }

  protected async save(): Promise<void> {
    const form = this.store.form();
    form.markAllAsTouched();
    if (!form.isValid()) {
      this.error.set('Check the fields marked in red.');
      return;
    }
    this.isSaving.set(true);
    try {
      const tariff = await this.store.save();
      this.snackBar.open('Saved. New prices apply to sessions that start from now on.', 'OK', {
        duration: 6000,
      });
      this.error.set('');
      await this.router.navigate(['/tariffs', tariff.id]);
      await this.store.load(tariff.id, this.isEditable());
    } catch (error) {
      this.fail(error);
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async archive(): Promise<void> {
    const dialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: `Archive ${this.store.tariff()?.name}?`,
        message:
          'Past sessions keep their prices. A tariff that sites still use cannot be archived.',
        confirmLabel: 'Archive tariff',
      },
    });
    if ((await firstValueFrom(dialog.afterClosed())) !== true) {
      return;
    }
    try {
      await this.store.archive();
      await this.router.navigate(['/tariffs']);
    } catch (error) {
      this.fail(error);
    }
  }

  private fail(error: unknown): void {
    this.error.set(ApiProblem.from(error).detail);
  }
}
