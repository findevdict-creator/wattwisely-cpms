import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { BrandService } from '../../core/branding/brand.service';
import { ChipTone, Initials, OperatorStore, PaymentModeWords } from '@wattwisely/driver-core';

/**
 * One operator the driver is linked with (module 19, story DRV-05): what it holds about
 * them, whether their charges there are paid, and the way to leave it. Right after the
 * invitation is accepted, the page says the link is made.
 */
@Component({
  selector: 'ww-operator',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatProgressSpinnerModule, RouterLink],
  providers: [OperatorStore],
  templateUrl: './operator.component.html',
  styleUrl: './operator.component.scss',
})
export class OperatorComponent implements OnInit {
  readonly tenantId = input.required<string>();
  /** `?linked=1`: the driver has just accepted the invitation. */
  readonly linked = input<string>();

  protected readonly store = inject(OperatorStore);
  private readonly router = inject(Router);

  protected readonly isLeaveAsked = signal(false);
  protected readonly isJustLinked = computed(() => this.linked() === '1');
  protected readonly initials = computed(() =>
    Initials.of(this.store.profile()?.operator_name ?? ''),
  );
  protected readonly paymentWords = computed(() => {
    const profile = this.store.profile();
    return profile ? PaymentModeWords.long(profile.payment_mode, profile.operator_name) : '';
  });

  constructor() {
    inject(BrandService).reset();
  }

  ngOnInit(): void {
    void this.store.load(this.tenantId());
  }

  protected cardStatus(status: string): string {
    return PaymentModeWords.cardStatus(status);
  }

  protected cardTone(status: string): ChipTone {
    return status === 'active' ? 'live' : 'danger';
  }

  protected async leave(): Promise<void> {
    if (await this.store.leave(this.tenantId())) {
      await this.router.navigate(['/account']);
    }
  }
}
