import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { StaffContextService } from '../../core/staff/staff-context.service';
import { PromptDialogComponent, PromptDialogData } from '../../shared/prompt-dialog.component';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { EditTenantDialogComponent } from './edit-tenant-dialog.component';
import { TenantModulesComponent } from './tenant-modules.component';
import { TenantOwnersComponent } from './tenant-owners.component';
import { TenantPlanComponent } from './tenant-plan.component';
import { TenantStore } from './tenant.store';

/** One tenant: who they are, their plan and modules, their Owners, and the lifecycle actions. */
@Component({
  selector: 'ww-tenant',
  imports: [
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    RouterLink,
    StatusChipComponent,
    TenantModulesComponent,
    TenantOwnersComponent,
    TenantPlanComponent,
  ],
  providers: [TenantStore],
  templateUrl: './tenant.component.html',
  styleUrl: './tenant.component.scss',
})
export class TenantComponent implements OnInit {
  readonly id = input.required<string>();
  protected readonly store = inject(TenantStore);
  protected readonly staff = inject(StaffContextService);
  private readonly dialog = inject(MatDialog);

  ngOnInit(): void {
    void this.store.load(this.id());
  }

  protected async edit(): Promise<void> {
    const dialog = this.dialog.open(EditTenantDialogComponent, {
      data: this.store.current(),
      width: '480px',
    });
    if (await firstValueFrom(dialog.afterClosed())) {
      this.store.tell('Tenant details saved.');
      await this.store.load();
    }
  }

  protected async suspend(): Promise<void> {
    const reason = await this.prompt({
      title: `Suspend ${this.store.current().name}?`,
      message:
        'Their team can still log in and look at everything, but change nothing. Charging keeps working. The reason goes to the audit log.',
      label: 'Reason',
      confirmLabel: 'Suspend',
    });
    if (reason) {
      await this.store.suspend(reason);
    }
  }

  protected async reactivate(): Promise<void> {
    const reason = await this.prompt({
      title: `Reactivate ${this.store.current().name}?`,
      message: 'Their team can change things again right away.',
      label: 'Reason',
      confirmLabel: 'Reactivate',
    });
    if (reason) {
      await this.store.reactivate(reason);
    }
  }

  protected async delete(): Promise<void> {
    const tenant = this.store.current();
    const confirmSlug = await this.prompt({
      title: `Delete ${tenant.name}?`,
      message: `Nobody can log in to it afterwards and the short name "${tenant.slug}" stays taken. Type the short name to confirm.`,
      label: 'Short name',
      confirmLabel: 'Continue',
      mustEqual: tenant.slug,
    });
    if (!confirmSlug) {
      return;
    }
    const reason = await this.prompt({
      title: 'Why is it deleted?',
      message: 'The reason goes to the audit log.',
      label: 'Reason',
      confirmLabel: 'Delete tenant',
    });
    if (reason) {
      await this.store.delete(confirmSlug, reason);
    }
  }

  private async prompt(data: PromptDialogData): Promise<string | undefined> {
    const dialog = this.dialog.open(PromptDialogComponent, { data, width: '480px' });
    return firstValueFrom(dialog.afterClosed());
  }
}
