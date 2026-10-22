import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { ChargersApiService } from '../../core/api/chargers-api.service';
import { Connector, ConnectorInput, ConnectorType } from '../../core/api/models/charger';

/** Add a connector to a charger, or change one. */
export interface ConnectorDialogData {
  chargerId: string;
  connector: Connector | null;
  nextNumber: number;
}

/** A connector's number, plug type, current and power (story AST-03). Closes with the saved one. */
@Component({
  selector: 'ww-connector-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './connector-dialog.component.html',
})
export class ConnectorDialogComponent {
  static readonly TYPES: { value: ConnectorType; label: string }[] = [
    { value: 'type2', label: 'Type 2 (AC)' },
    { value: 'ccs2', label: 'CCS2 (DC)' },
    { value: 'chademo', label: 'CHAdeMO (DC)' },
    { value: 'type1', label: 'Type 1 (AC)' },
    { value: 'ccs1', label: 'CCS1 (DC)' },
    { value: 'nacs', label: 'NACS' },
    { value: 'gbt', label: 'GB/T' },
    { value: 'unknown', label: 'Not sure yet' },
  ];

  protected readonly data = inject<ConnectorDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<ConnectorDialogComponent, Connector>>(MatDialogRef);
  private readonly chargersApi = inject(ChargersApiService);

  protected readonly types = ConnectorDialogComponent.TYPES;
  private readonly initial = ConnectorDialogComponent.valuesOf(this.data);
  protected readonly form = new FormGroup({
    ocppConnectorId: new FormControl(this.initial.ocppConnectorId, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(100)],
    }),
    label: new FormControl(this.initial.label, {
      nonNullable: true,
      validators: [Validators.maxLength(20)],
    }),
    type: new FormControl<ConnectorType>(this.initial.type, { nonNullable: true }),
    currentType: new FormControl<'ac' | 'dc' | ''>(this.initial.currentType, {
      nonNullable: true,
    }),
    maxPowerKw: new FormControl<number | null>(this.initial.maxPowerKw, [Validators.min(0)]),
  });
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  protected async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Check the fields marked in red.');
      return;
    }
    this.isSaving.set(true);
    try {
      const input = this.toInput();
      const request = this.data.connector
        ? this.chargersApi.updateConnector(this.data.connector, input)
        : this.chargersApi.addConnector(this.data.chargerId, input);
      this.dialogRef.close(await firstValueFrom(request));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }

  /** The connector being edited, or the defaults for a new one. */
  private static valuesOf(data: ConnectorDialogData) {
    const base = data.connector ?? {
      ocpp_connector_id: data.nextNumber,
      label: '',
      type: 'type2' as ConnectorType,
      current_type: null,
      max_power_kw: null,
    };
    return {
      ocppConnectorId: base.ocpp_connector_id,
      label: base.label,
      type: base.type,
      currentType: (base.current_type ?? '') as 'ac' | 'dc' | '',
      maxPowerKw: base.max_power_kw,
    };
  }

  private toInput(): ConnectorInput {
    const value = this.form.getRawValue();
    return {
      ocpp_connector_id: value.ocppConnectorId,
      ...(value.label.trim() ? { label: value.label.trim() } : {}),
      type: value.type,
      current_type: value.currentType || null,
      max_power_kw: value.maxPowerKw,
    };
  }
}
