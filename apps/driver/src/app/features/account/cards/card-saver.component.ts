import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CardSetup } from '../../../core/api/models/driver-payments';
import { CardForm } from '../../../core/payment/card-form';
import { CardFormFactory } from '../../../core/payment/card-form.factory';

/** The provider's form for saving a card: nothing is charged now; holds are taken when charging. */
@Component({
  selector: 'ww-card-saver',
  imports: [MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div #host class="host" data-testid="card-saver"></div>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
    <div class="actions">
      <button mat-stroked-button type="button" (click)="cancelled.emit()">Cancel</button>
      <button
        mat-flat-button
        type="button"
        (click)="save()"
        [disabled]="!isReady() || isSaving()"
        data-testid="save-card"
      >
        @if (isSaving()) {
          <mat-spinner diameter="20" />
        }
        Save card
      </button>
    </div>
  `,
  styles: `
    .host {
      min-height: 120px;
      margin: 12px 0;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `,
})
export class CardSaverComponent implements AfterViewInit, OnDestroy {
  readonly setup = input.required<CardSetup>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly factory = inject(CardFormFactory);
  private form: CardForm | null = null;

  protected readonly isReady = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly error = signal('');

  async ngAfterViewInit(): Promise<void> {
    const setup = this.setup();
    if (!setup.publishable_key) {
      this.error.set('Cards cannot be saved here right now.');
      return;
    }
    this.form = this.factory.createSaver({
      publishableKey: setup.publishable_key,
      clientSecret: setup.client_secret,
      returnUrl: window.location.href,
    });
    try {
      await this.form.mount(this.host().nativeElement);
      this.isReady.set(true);
    } catch (error) {
      this.error.set((error as Error).message);
    }
  }

  protected async save(): Promise<void> {
    if (!this.form) {
      return;
    }
    this.isSaving.set(true);
    this.error.set('');
    const result = await this.form.confirm();
    this.isSaving.set(false);
    if (result.isConfirmed) {
      this.saved.emit();
    } else {
      this.error.set(result.message ?? 'The card was refused.');
    }
  }

  ngOnDestroy(): void {
    this.form?.destroy();
  }
}
