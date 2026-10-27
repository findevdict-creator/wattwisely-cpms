import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../../core/api/api-problem';
import { IntegrationsApiService } from '../../../core/api/integrations-api.service';
import { WebhookEndpoint, WebhookEventType } from '../../../core/api/models/webhook';
import { WebhookForm } from './webhook-form';

/** What the dialog works on: the event types to pick from, and the endpoint when one is being changed. */
export interface WebhookDialogData {
  eventTypes: WebhookEventType[];
  endpoint: WebhookEndpoint | null;
}

/** Add or change a webhook endpoint (module 16): its URL and the events it listens for. Closes with the saved endpoint. */
@Component({
  selector: 'ww-webhook-dialog',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './webhook-dialog.component.html',
  styleUrl: './webhook-dialog.component.scss',
})
export class WebhookDialogComponent {
  protected readonly data = inject<WebhookDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<WebhookDialogComponent, WebhookEndpoint>>(MatDialogRef);
  private readonly integrationsApi = inject(IntegrationsApiService);

  protected readonly form = this.data.endpoint
    ? WebhookForm.of(this.data.endpoint)
    : new WebhookForm();
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  protected get isEditing(): boolean {
    return this.data.endpoint !== null;
  }

  protected async save(): Promise<void> {
    this.form.fields.markAllAsTouched();
    if (!this.form.isValid()) {
      this.error.set(
        this.form.eventTypes().length === 0
          ? 'Tick at least one event.'
          : 'Enter an https URL the internet can reach.',
      );
      return;
    }
    this.isSaving.set(true);
    try {
      const saved = await firstValueFrom(this.request());
      this.dialogRef.close(saved);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }

  private request() {
    const input = this.form.toInput();
    return this.data.endpoint
      ? this.integrationsApi.updateWebhook(this.data.endpoint, input)
      : this.integrationsApi.createWebhook(input);
  }
}
