import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent, PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { AuditLogApiService } from '../../core/api/audit-log-api.service';
import { AuditLogEntry } from '../../core/api/models/audit-log';
import { ReportsApiService } from '../../core/api/reports-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';

/**
 * Settings > Audit log: who changed what, newest first (story SEC-01). Read-only. In a
 * managed company the entries Wattwisely wrote are marked, and can be shown on their own.
 */
@Component({
  selector: 'ww-audit-log',
  imports: [
    DatePipe,
    EmptyStateComponent,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    PageHeaderComponent,
    RouterLink,
  ],
  templateUrl: './audit-log.component.html',
  styleUrl: './audit-log.component.scss',
})
export class AuditLogComponent implements OnInit {
  static readonly KINDS: Record<string, string> = {
    user: 'Team member',
    api_key: 'API key',
    support: 'Wattwisely support',
    system: 'Automatic',
    platform: 'Wattwisely',
    managed: 'Wattwisely managed service',
    driver: 'Driver',
  };
  static readonly TEST_IDS: Record<string, string> = {
    managed: 'actor-wattwisely',
    api_key: 'actor-api-key',
    driver: 'actor-driver',
  };

  private readonly auditLogApi = inject(AuditLogApiService);
  private readonly reportsApi = inject(ReportsApiService);
  protected readonly permissions = inject(PermissionsService);

  protected readonly columns = ['occurred_at', 'actor', 'action', 'target'];
  protected readonly entries = signal<AuditLogEntry[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  /** 'managed' shows only what Wattwisely did; null everything. */
  protected readonly actorType = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly selected = signal<AuditLogEntry | null>(null);

  ngOnInit(): void {
    void this.loadMore();
  }

  /** "Team member", "API key", "Wattwisely managed service" and so on. */
  protected actorKind(entry: AuditLogEntry): string {
    return AuditLogComponent.KINDS[entry.actor_type] ?? entry.actor_type;
  }

  protected actorTestId(entry: AuditLogEntry): string | null {
    return AuditLogComponent.TEST_IDS[entry.actor_type] ?? null;
  }

  protected async show(actorType: string | null): Promise<void> {
    this.actorType.set(actorType || null);
    this.entries.set([]);
    this.nextCursor.set(null);
    await this.loadMore();
  }

  protected async loadMore(): Promise<void> {
    try {
      const page = await firstValueFrom(this.auditLogApi.list(this.nextCursor(), this.actorType()));
      this.entries.update((entries) => [...entries, ...page.items]);
      this.nextCursor.set(page.next_cursor);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  /** The whole log as a CSV file, built in the background and listed on the Reports page. */
  protected async export(): Promise<void> {
    try {
      await firstValueFrom(this.reportsApi.createExport({ kind: 'audit_log' }));
      this.notice.set(
        'The audit log is being exported. It will be on the Reports page, and in your e-mail, when it is ready.',
      );
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}
