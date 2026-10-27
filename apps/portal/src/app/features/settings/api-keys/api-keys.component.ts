import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../../core/api/api-problem';
import { IntegrationsApiService } from '../../../core/api/integrations-api.service';
import { ApiKey, CreatedApiKey } from '../../../core/api/models/api-key';
import { TeamApiService } from '../../../core/api/team-api.service';
import { PermissionsService } from '../../../core/permissions/permissions.service';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog.component';
import { StatusChipComponent } from '../../../shared/status-chip.component';
import { ApiKeyDialogComponent, ApiKeyDialogData } from './api-key-dialog.component';
import { CreatedKeyDialogComponent } from './created-key-dialog.component';

/** Settings > API keys (module 16): the keys the company's own systems call the API with. */
@Component({
  selector: 'ww-api-keys',
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    StatusChipComponent,
  ],
  templateUrl: './api-keys.component.html',
  styleUrl: './api-keys.component.scss',
})
export class ApiKeysComponent implements OnInit {
  protected readonly permissions = inject(PermissionsService);
  private readonly integrationsApi = inject(IntegrationsApiService);
  private readonly teamApi = inject(TeamApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly columns = [
    'name',
    'hint',
    'permissions',
    'created_by',
    'last_used',
    'status',
    'actions',
  ];
  protected readonly keys = signal<ApiKey[]>([]);
  protected readonly isLoaded = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    void this.load();
  }

  protected isLocked(): boolean {
    return this.permissions.isModuleLocked('api_keys');
  }

  protected canManage(): boolean {
    return this.permissions.canChange('api_keys:manage') && !this.isLocked();
  }

  protected permissionSummary(key: ApiKey): string {
    return key.permissions.length === 1 ? '1 permission' : `${key.permissions.length} permissions`;
  }

  protected async add(): Promise<void> {
    const data: ApiKeyDialogData = {
      permissions: await firstValueFrom(this.teamApi.listPermissions()),
    };
    const dialog = this.dialog.open(ApiKeyDialogComponent, { data, width: '640px' });
    const created: CreatedApiKey | undefined = await firstValueFrom(dialog.afterClosed());
    if (created) {
      this.dialog.open(CreatedKeyDialogComponent, {
        data: created,
        width: '560px',
        disableClose: true,
      });
      await this.load();
    }
  }

  protected async revoke(key: ApiKey): Promise<void> {
    const dialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: `Revoke ${key.name}?`,
        message: 'Every system using this key stops working at once. This cannot be undone.',
        confirmLabel: 'Revoke key',
      },
    });
    if ((await firstValueFrom(dialog.afterClosed())) !== true) {
      return;
    }
    try {
      await firstValueFrom(this.integrationsApi.revokeKey(key));
      this.snackBar.open(`${key.name} revoked.`, 'OK', { duration: 6000 });
      await this.load();
    } catch (error) {
      this.snackBar.open(ApiProblem.from(error).detail, 'OK', { duration: 6000 });
    }
  }

  private async load(): Promise<void> {
    try {
      this.keys.set(await firstValueFrom(this.integrationsApi.listKeys()));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isLoaded.set(true);
    }
  }
}
