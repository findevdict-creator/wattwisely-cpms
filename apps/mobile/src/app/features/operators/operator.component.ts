import { Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { IonButton, IonContent, IonSpinner, NavController } from '@ionic/angular';
import { ChipTone, OperatorStore, PaymentModeWords } from '@wattwisely/driver-core';
import { Confirmation } from '../../shared/confirmation';
import { PageBarComponent } from '../../shared/page-bar.component';

/**
 * One operator (Figma 11, "My operators", and "Manage" on Privacy and data): who pays for
 * the driver's charges there, what the operator holds about them, and the way to leave it.
 */
@Component({
  selector: 'ww-operator',
  imports: [IonButton, IonContent, IonSpinner, MatIconModule, PageBarComponent],
  providers: [OperatorStore],
  templateUrl: './operator.component.html',
  styleUrl: './operators.scss',
})
export class OperatorComponent {
  /** The route's :tenantId. */
  readonly tenantId = input.required<string>();

  protected readonly store = inject(OperatorStore);
  private readonly confirmation = inject(Confirmation);
  private readonly navController = inject(NavController);

  protected readonly title = computed(() => this.store.profile()?.operator_name ?? 'Operator');
  protected readonly paying = computed(() => {
    const profile = this.store.profile();
    return profile ? PaymentModeWords.long(profile.payment_mode, profile.operator_name) : '';
  });
  protected readonly cardStatus = PaymentModeWords.cardStatus;

  ionViewWillEnter(): void {
    void this.store.load(this.tenantId());
  }

  protected cardTone(status: string): ChipTone {
    return status === 'active' ? 'live' : 'danger';
  }

  protected async leave(): Promise<void> {
    const isSure = await this.confirmation.ask({
      header: `Leave ${this.title()}?`,
      message: `${this.title()} keeps its record of you, but your login no longer opens it and your charges there leave this app. It can invite you again.`,
      confirm: 'Leave',
      isDanger: true,
    });
    if (isSure && (await this.store.leave(this.tenantId()))) {
      await this.navController.navigateBack('/account/operators');
    }
  }
}
