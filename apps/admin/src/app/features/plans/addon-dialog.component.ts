import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Addon } from '../../core/api/models/plan';
import { PlansApiService } from '../../core/api/plans-api.service';
import { Money } from '../../shared/money';

/** Change an add-on's price, how it is counted, and whether it is sold. Closes with true when saved. */
@Component({
  selector: 'ww-addon-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ addon.name }}</h2>
    <mat-dialog-content class="content" [formGroup]="form">
      <p class="hint">{{ addon.description }}</p>
      <mat-form-field appearance="outline">
        <mat-label>Price per month ({{ addon.currency }})</mat-label>
        <input matInput formControlName="price" data-testid="addon-price" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Counted</mat-label>
        <mat-select formControlName="pricing_unit">
          <mat-option value="per_connector">Per connector</mat-option>
          <mat-option value="per_site">Per site</mat-option>
          <mat-option value="per_tenant">Per tenant</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-slide-toggle formControlName="is_active">Sold to tenants</mat-slide-toggle>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button (click)="save()" [disabled]="isSaving()" data-testid="save-addon">
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 8px;
    }
  `,
})
export class AddonDialogComponent {
  protected readonly addon = inject<Addon>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<AddonDialogComponent, boolean>>(MatDialogRef);
  private readonly plansApi = inject(PlansApiService);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    price: [Money.toText(this.addon.price, this.addon.currency), Validators.required],
    pricing_unit: [this.addon.pricing_unit],
    is_active: [this.addon.is_active],
  });
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  protected async save(): Promise<void> {
    const value = this.form.getRawValue();
    const price = Money.fromText(value.price, this.addon.currency);
    if (price === null) {
      this.error.set(`Enter the price in ${this.addon.currency}, such as 3.00.`);
      return;
    }
    this.isSaving.set(true);
    try {
      const body = { price, pricing_unit: value.pricing_unit, is_active: value.is_active };
      await firstValueFrom(this.plansApi.updateAddon(this.addon, body));
      this.dialogRef.close(true);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }
}
