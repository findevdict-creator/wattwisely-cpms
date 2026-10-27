import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { TariffBandsComponent } from './tariff-bands.component';
import { TariffDriverViewComponent } from './tariff-driver-view.component';
import { TariffEditorStore } from './tariff-editor.store';
import { TariffPreviewComponent } from './tariff-preview.component';

/** A new tariff, or one tariff: its prices, bands, a cost preview and the price history. */
@Component({
  selector: 'ww-tariff',
  imports: [
    DatePipe,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    PageHeaderComponent,
    ReactiveFormsModule,
    TariffBandsComponent,
    TariffDriverViewComponent,
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
  /** A Managed operator's change goes to the Owner as a proposal instead of applying. */
  protected readonly isProposal = computed(() => this.permissions.mustProposeTariffs());
  protected readonly saveLabel = computed(() => {
    const tariff = this.store.tariff();
    if (this.isProposal()) {
      return 'Propose to the Owner';
    }
    return tariff ? `Save as version ${tariff.current_version.number + 1}` : 'Create tariff';
  });

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
      const result = await this.store.save(this.isProposal());
      this.error.set('');
      if (result.kind === 'proposal') {
        this.snackBar.open('Sent to the Owner for approval.', 'OK', { duration: 6000 });
        await this.router.navigate(['/tariffs/proposals', result.proposal.id]);
        return;
      }
      this.snackBar.open('Saved. New prices apply to sessions that start from now on.', 'OK', {
        duration: 6000,
      });
      await this.router.navigate(['/tariffs', result.tariff.id]);
      await this.store.load(result.tariff.id, this.isEditable());
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
