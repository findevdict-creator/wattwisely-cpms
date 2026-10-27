import { DecimalPipe } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { TariffPreview } from '../../core/api/models/tariff';
import { TariffsApiService } from '../../core/api/tariffs-api.service';
import { MoneyPipe } from '../../shared/money.pipe';
import { ReceiptComponent } from '../sessions/receipt.component';
import { TariffForm } from './tariff-form';

/**
 * "What would this cost?": prices a made-up session with the prices on screen, before
 * they are saved, with the same engine that prices real sessions. Times are in the
 * browser's time zone.
 */
@Component({
  selector: 'ww-tariff-preview',
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MoneyPipe,
    ReactiveFormsModule,
    ReceiptComponent,
  ],
  templateUrl: './tariff-preview.component.html',
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      padding-top: 8px;
    }
    .wide {
      grid-column: 1 / -1;
    }
    .run {
      align-self: flex-start;
    }
    .total {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    ww-receipt {
      margin: 0 -20px;
    }
  `,
})
export class TariffPreviewComponent {
  readonly form = input.required<TariffForm>();
  private readonly tariffsApi = inject(TariffsApiService);

  protected readonly session = new FormGroup({
    start: new FormControl(TariffPreviewComponent.todayAt('16:30'), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    minutes: new FormControl(60, { nonNullable: true, validators: [Validators.min(1)] }),
    energyKwh: new FormControl(22, { nonNullable: true, validators: [Validators.min(0)] }),
    idleMinutes: new FormControl(25, { nonNullable: true, validators: [Validators.min(0)] }),
  });
  protected readonly preview = signal<TariffPreview | null>(null);
  protected readonly error = signal('');

  protected async run(): Promise<void> {
    const form = this.form();
    form.markAllAsTouched();
    if (!form.isValid() || !this.session.valid) {
      this.error.set('Check the prices and the session first.');
      return;
    }
    const value = this.session.getRawValue();
    const startedAt = new Date(value.start);
    const request = {
      currency: form.currency,
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      prices: form.toPrices(),
      started_at: startedAt.toISOString(),
      ended_at: new Date(startedAt.getTime() + value.minutes * 60_000).toISOString(),
      energy_wh: Math.round(value.energyKwh * 1000),
      idle_minutes: value.idleMinutes,
    };
    try {
      this.preview.set(await firstValueFrom(this.tariffsApi.preview(request)));
      this.error.set('');
    } catch (error) {
      this.preview.set(null);
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  /** Today at a local time, as a datetime-local input wants it. */
  private static todayAt(time: string): string {
    const now = new Date();
    const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
      .map((part) => String(part).padStart(2, '0'))
      .join('-');
    return `${date}T${time}`;
  }
}
