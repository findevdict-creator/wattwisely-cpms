import { signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { WebhookEndpoint, WebhookInput } from '../../../core/api/models/webhook';

/** The webhook dialog's fields and ticked event types, and how they turn into the API's body (module 16). */
export class WebhookForm {
  readonly fields = new FormGroup({
    url: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(2000), WebhookForm.httpsUrl],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(300)],
    }),
  });
  readonly eventTypes = signal<string[]>([]);

  /** Starts from an endpoint that is being changed. */
  static of(endpoint: WebhookEndpoint): WebhookForm {
    const form = new WebhookForm();
    form.fields.setValue({ url: endpoint.url, description: endpoint.description });
    form.eventTypes.set([...endpoint.event_types]);
    return form;
  }

  /** The URL must be https, except for http on localhost while developing. */
  static httpsUrl(control: { value: string }): Record<string, boolean> | null {
    const value = control.value.trim();
    if (!value) {
      return null;
    }
    try {
      const url = new URL(value);
      const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      return url.protocol === 'https:' || (url.protocol === 'http:' && isLocal)
        ? null
        : { https: true };
    } catch {
      return { url: true };
    }
  }

  has(eventType: string): boolean {
    return this.eventTypes().includes(eventType);
  }

  set(eventType: string, isTicked: boolean): void {
    this.eventTypes.update((current) => {
      const rest = current.filter((entry) => entry !== eventType);
      return isTicked ? [...rest, eventType] : rest;
    });
  }

  /** A URL and at least one event type. */
  isValid(): boolean {
    return this.fields.valid && this.eventTypes().length > 0;
  }

  toInput(): WebhookInput {
    const value = this.fields.getRawValue();
    return {
      url: value.url.trim(),
      description: value.description.trim(),
      event_types: [...this.eventTypes()],
    };
  }
}
