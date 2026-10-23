import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { PlanModule, Subscription } from '../../core/api/models/subscription';
import { SubscriptionApiService } from '../../core/api/subscription-api.service';
import { MoneyPipe } from '../../shared/money.pipe';

/**
 * Settings, Plan: which plan the company is on, how much of its limits it uses, and which
 * modules are on or locked. Read-only: changes are made with Wattwisely, not here.
 */
@Component({
  selector: 'ww-plan',
  imports: [DatePipe, MatCardModule, MatIconModule, MoneyPipe],
  templateUrl: './plan.component.html',
  styleUrl: './plan.component.scss',
})
export class PlanComponent implements OnInit {
  static readonly STATUS_LABELS: Record<string, string> = {
    trialing: 'Trial',
    active: 'Active',
    past_due: 'Payment overdue',
    cancelled: 'Cancelled',
  };
  static readonly SOURCE_LABELS: Record<string, string> = {
    core: 'Included',
    plan: 'In your plan',
    addon: 'Add-on',
    trial: 'On trial',
    override: 'Included for you',
  };

  private readonly subscriptionApi = inject(SubscriptionApiService);

  protected readonly subscription = signal<Subscription | null>(null);
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      this.subscription.set(await firstValueFrom(this.subscriptionApi.get()));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  protected statusLabel(status: string | null): string {
    return status ? (PlanComponent.STATUS_LABELS[status] ?? status) : 'No plan yet';
  }

  protected sourceLabel(module: PlanModule): string {
    if (!module.is_enabled) {
      return module.kind === 'addon' ? 'Available as an add-on' : 'Not in your plan';
    }
    return PlanComponent.SOURCE_LABELS[module.source ?? ''] ?? '';
  }

  protected unitLabel(unit: string): string {
    return (
      { per_connector: 'per connector', per_site: 'per site', per_tenant: 'per month' }[unit] ?? ''
    );
  }

  protected percentOf(used: number, limit: number | null): number {
    return limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  }
}
