import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Observable, firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { PlatformRoleDefinition, StaffMember } from '../../core/api/models/staff';
import { StaffApiService } from '../../core/api/staff-api.service';
import { StaffContextService } from '../../core/staff/staff-context.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { AddStaffDialogComponent } from './add-staff-dialog.component';

/** Staff: who at Wattwisely can use this console, with which role. */
@Component({
  selector: 'ww-staff',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatMenuModule, MatTableModule],
  templateUrl: './staff.component.html',
  styleUrl: './staff.component.scss',
})
export class StaffComponent implements OnInit {
  protected readonly staff = inject(StaffContextService);
  private readonly staffApi = inject(StaffApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly columns = ['person', 'role', 'since', 'actions'];
  protected readonly members = signal<StaffMember[]>([]);
  protected readonly roles = signal<PlatformRoleDefinition[]>([]);
  protected readonly error = signal('');

  ngOnInit(): void {
    void this.load();
  }

  protected roleName(key: string): string {
    return this.roles().find((role) => role.key === key)?.name ?? key;
  }

  protected isMe(member: StaffMember): boolean {
    return member.user_account_id === this.staff.me()?.id;
  }

  protected async add(): Promise<void> {
    const dialog = this.dialog.open(AddStaffDialogComponent, {
      data: this.roles(),
      width: '480px',
    });
    const added: StaffMember | undefined = await firstValueFrom(dialog.afterClosed());
    if (added) {
      this.tell(
        `${added.name || added.email} can now use the console as ${this.roleName(added.role)}.`,
      );
      await this.load();
    }
  }

  protected changeRole(member: StaffMember, role: string): Promise<void> {
    return this.change(
      this.staffApi.changeRole(member, role),
      `${member.name || member.email} is now ${this.roleName(role)}.`,
    );
  }

  protected async remove(member: StaffMember): Promise<void> {
    const dialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: `Remove ${member.name || member.email} from staff?`,
        message: 'They lose access to this console within a minute. Any tenant memberships stay.',
        confirmLabel: 'Remove',
      },
    });
    if ((await firstValueFrom(dialog.afterClosed())) === true) {
      await this.change(this.staffApi.remove(member), `${member.name || member.email} removed.`);
    }
  }

  private async load(): Promise<void> {
    try {
      const [members, roles] = await Promise.all([
        firstValueFrom(this.staffApi.list()),
        firstValueFrom(this.staffApi.listRoles()),
      ]);
      this.members.set(members);
      this.roles.set(roles);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  private async change(request: Observable<unknown>, success: string): Promise<void> {
    try {
      await firstValueFrom(request);
      this.tell(success);
      await this.load();
    } catch (error) {
      this.tell(ApiProblem.from(error).detail);
    }
  }

  private tell(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 6000 });
  }
}
