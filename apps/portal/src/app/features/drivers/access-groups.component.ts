import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AccessGroupsApiService } from '../../core/api/access-groups-api.service';
import { ApiProblem } from '../../core/api/api-problem';
import { AccessGroup } from '../../core/api/models/driver';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { AccessGroupDialogComponent } from './access-group-dialog.component';

/** Access groups: which drivers may charge at which private sites (story AST-04). */
@Component({
  selector: 'ww-access-groups',
  imports: [MatButtonModule, MatIconModule, MatTableModule, RouterLink],
  templateUrl: './access-groups.component.html',
  styleUrl: './access-groups.component.scss',
})
export class AccessGroupsComponent implements OnInit {
  protected readonly permissions = inject(PermissionsService);
  private readonly groupsApi = inject(AccessGroupsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly groups = signal<AccessGroup[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly error = signal('');
  protected readonly columns = ['name', 'sites', 'members', 'actions'];

  ngOnInit(): void {
    void this.load();
  }

  protected async edit(group: AccessGroup | null): Promise<void> {
    const dialog = this.dialog.open(AccessGroupDialogComponent, { data: group, width: '560px' });
    const saved = await firstValueFrom(dialog.afterClosed());
    if (saved) {
      this.tell(group ? `${saved.name} saved.` : `${saved.name} created.`);
      await this.load();
    }
  }

  protected async remove(group: AccessGroup): Promise<void> {
    const dialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: `Delete ${group.name}?`,
        message: 'Its drivers lose access to the private sites it opens. Nothing else changes.',
        confirmLabel: 'Delete group',
      },
    });
    if ((await firstValueFrom(dialog.afterClosed())) !== true) {
      return;
    }
    try {
      await firstValueFrom(this.groupsApi.remove(group), { defaultValue: undefined });
      this.tell(`${group.name} deleted.`);
      await this.load();
    } catch (error) {
      this.tell(ApiProblem.from(error).detail);
    }
  }

  protected names(rows: { name: string }[]): string {
    return rows.map((row) => row.name).join(', ');
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      this.groups.set((await firstValueFrom(this.groupsApi.list())).items);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isLoading.set(false);
    }
  }

  private tell(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 6000 });
  }
}
