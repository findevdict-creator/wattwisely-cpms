import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { AuditLogApiService } from '../../core/api/audit-log-api.service';
import { AuditLogEntry } from '../../core/api/models/audit-log';
import { PermissionsService } from '../../core/permissions/permissions.service';

/**
 * Settings > Audit log: who changed what, newest first (story SEC-01). Read-only. In a
 * managed company the entries Wattwisely wrote are marked, and can be shown on their own.
 */
@Component({
  selector: 'ww-audit-log',
  imports: [DatePipe, MatButtonModule, MatButtonToggleModule, MatChipsModule, MatTableModule],
  templateUrl: './audit-log.component.html',
  styleUrl: './audit-log.component.scss',
})
export class AuditLogComponent implements OnInit {
  private readonly auditLogApi = inject(AuditLogApiService);
  protected readonly permissions = inject(PermissionsService);

  protected readonly columns = ['occurred_at', 'actor', 'action', 'target'];
  protected readonly entries = signal<AuditLogEntry[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  /** 'managed' shows only what Wattwisely did; null everything. */
  protected readonly actorType = signal<string | null>(null);
  protected readonly error = signal('');

  ngOnInit(): void {
    void this.loadMore();
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
}
