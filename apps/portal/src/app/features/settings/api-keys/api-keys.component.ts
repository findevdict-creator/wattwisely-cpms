import { Clipboard } from '@angular/cdk/clipboard';
import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EmptyStateComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../../core/api/api-problem';
import { IntegrationsApiService } from '../../../core/api/integrations-api.service';
import { ApiKey, CreatedApiKey } from '../../../core/api/models/api-key';
import { TeamApiService } from '../../../core/api/team-api.service';
import { PermissionsService } from '../../../core/permissions/permissions.service';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog.component';
import { DayLabel } from '../../../shared/day-label';
import { DurationLabel } from '../../../shared/duration-label';
import { StatusChipComponent } from '../../../shared/status-chip.component';
import { ApiKeyDialogComponent, ApiKeyDialogData } from './api-key-dialog.component';

/** Settings > API keys (module 16): the keys the company's own systems call the API with. */
@Component({
  selector: 'ww-api-keys',
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    EmptyStateComponent,
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
  private readonly clipboard = inject(Clipboard);

  protected readonly columns = ['name', 'permissions', 'created', 'last_used', 'status', 'actions'];
  protected readonly keys = signal<ApiKey[]>([]);
  protected readonly isLoaded = signal(false);
  protected readonly error = signal('');
  /** A key just made: its token is on the page until Done, and never again. */
  protected readonly created = signal<CreatedApiKey | null>(null);
  protected readonly isCopied = signal(false);

  protected readonly countLine = computed(() => {
    const keys = this.keys();
    const active = keys.filter((key) => key.status === 'active').length;
    return `${keys.length === 1 ? '1 key' : `${keys.length} keys`}, ${active} active`;
  });

  ngOnInit(): void {
    void this.load();
  }

  protected isLocked(): boolean {
    return this.permissions.isModuleLocked('api_keys');
  }

  protected canManage(): boolean {
    return this.permissions.canChange('api_keys:manage') && !this.isLocked();
  }

  /** The first two permissions, then how many more. */
  protected scopesOf(key: ApiKey): string {
    const shown = key.permissions.slice(0, 2).join(' · ');
    const more = key.permissions.length - 2;
    return more > 0 ? `${shown} +${more}` : shown;
  }

  protected lastUsedOf(key: ApiKey): string {
    return key.last_used_at ? DurationLabel.ago(key.last_used_at) : 'Never used';
  }

  protected expiryOf(key: ApiKey): string {
    if (key.revoked_at) {
      return `Revoked ${DayLabel.inSentence(key.revoked_at)}`;
    }
    if (!key.expires_at) {
      return 'No expiry';
    }
    const verb = key.status === 'expired' ? 'Expired' : 'Expires';
    return `${verb} ${DayLabel.inSentence(key.expires_at)}`;
  }

  protected copy(created: CreatedApiKey): void {
    this.clipboard.copy(created.token);
    this.isCopied.set(true);
  }

  protected forget(): void {
    this.created.set(null);
    this.isCopied.set(false);
  }

  protected async add(): Promise<void> {
    const data: ApiKeyDialogData = {
      permissions: await firstValueFrom(this.teamApi.listPermissions()),
    };
    const dialog = this.dialog.open(ApiKeyDialogComponent, { data, width: '640px' });
    const created: CreatedApiKey | undefined = await firstValueFrom(dialog.afterClosed());
    if (created) {
      this.isCopied.set(false);
      this.created.set(created);
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
