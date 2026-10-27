import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { EmptyStateComponent, PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { InviteResult, Member } from '../../core/api/models/member';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/confirm-dialog.component';
import { Initials } from '../../shared/initials';
import { EditRolesDialogComponent } from './edit-roles-dialog.component';
import { InviteDialogComponent } from './invite-dialog.component';
import { MemberRoles } from './member-roles';
import { TeamTabsComponent } from './team-tabs.component';
import { TeamStore } from './team.store';

/** Settings > Team: who has access, with which roles; invite, change and remove (ACC-02, ACC-03). */
@Component({
  selector: 'ww-team',
  imports: [
    DatePipe,
    EmptyStateComponent,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTableModule,
    PageHeaderComponent,
    TeamTabsComponent,
  ],
  providers: [TeamStore],
  templateUrl: './team.component.html',
  styleUrl: './team.component.scss',
})
export class TeamComponent implements OnInit {
  protected readonly store = inject(TeamStore);
  protected readonly permissions = inject(PermissionsService);
  private readonly dialog = inject(MatDialog);
  protected readonly columns = ['person', 'roles', 'where', 'status', 'actions'];
  protected readonly initialsOf = (member: Member) => Initials.of(member.name || member.email);

  ngOnInit(): void {
    void this.store.load();
  }

  protected whereOf(member: Member): string {
    return member.is_managed_operator
      ? 'Managed service'
      : MemberRoles.where(member, this.store.sites());
  }

  protected search(query: string): void {
    void this.store.load(query.trim());
  }

  protected async invite(): Promise<void> {
    const data = { roles: this.store.roles(), sites: this.store.sites() };
    const dialog = this.dialog.open(InviteDialogComponent, { data, width: '560px' });
    const result: InviteResult | undefined = await firstValueFrom(dialog.afterClosed());
    if (result) {
      this.store.tell(
        result.is_email_sent
          ? `Invitation sent to ${result.member.email}.`
          : `Invitation saved, but the e-mail could not be sent. Use "Send again" later.`,
      );
      await this.store.load();
    }
  }

  protected async editRoles(member: Member): Promise<void> {
    const data = { member, roles: this.store.roles(), sites: this.store.sites() };
    const dialog = this.dialog.open(EditRolesDialogComponent, { data, width: '560px' });
    if (await firstValueFrom(dialog.afterClosed())) {
      this.store.tell(`Roles of ${member.name || member.email} changed.`);
      await this.store.load();
    }
  }

  protected async remove(member: Member): Promise<void> {
    const isConfirmed = await this.confirm({
      title: `Remove ${member.name || member.email}?`,
      message:
        'They lose access to this company within a minute. Their past actions stay in the audit log.',
      confirmLabel: 'Remove',
    });
    if (isConfirmed) {
      await this.store.remove(member);
    }
  }

  protected async cancelInvitation(member: Member): Promise<void> {
    const isConfirmed = await this.confirm({
      title: 'Cancel this invitation?',
      message: `The link sent to ${member.email} stops working.`,
      confirmLabel: 'Cancel invitation',
    });
    if (isConfirmed) {
      await this.store.cancelInvitation(member);
    }
  }

  private async confirm(data: ConfirmDialogData): Promise<boolean> {
    const dialog = this.dialog.open(ConfirmDialogComponent, { data });
    return (await firstValueFrom(dialog.afterClosed())) === true;
  }
}
