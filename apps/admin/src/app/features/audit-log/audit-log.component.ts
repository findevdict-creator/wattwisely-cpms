import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent, PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { PlatformAuditEntry } from '../../core/api/models/audit-log';
import { OverviewApiService } from '../../core/api/overview-api.service';

/** Audit log: what staff and tenants did across the platform, newest first. Read-only. */
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
  static readonly ACTOR_KINDS: Record<string, string> = {
    user: 'Tenant team',
    api_key: 'API key',
    support: 'Wattwisely support',
    system: 'Wattwisely',
    platform: 'Wattwisely staff',
  };

  private readonly overviewApi = inject(OverviewApiService);

  protected readonly columns = ['occurred_at', 'actor', 'action', 'target', 'tenant'];
  protected readonly actorKinds = AuditLogComponent.ACTOR_KINDS;
  protected readonly entries = signal<PlatformAuditEntry[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  protected readonly isLoaded = signal(false);
  protected readonly error = signal('');
  private tenantId: string | null = null;

  ngOnInit(): void {
    void this.loadMore();
  }

  protected filter(tenantId: string): void {
    const next = tenantId.trim() || null;
    if (next === this.tenantId) {
      return;
    }
    this.tenantId = next;
    this.entries.set([]);
    this.nextCursor.set(null);
    void this.loadMore();
  }

  protected async loadMore(): Promise<void> {
    try {
      const page = await firstValueFrom(
        this.overviewApi.listAuditLog(this.nextCursor(), this.tenantId),
      );
      this.entries.update((entries) => [...entries, ...page.items]);
      this.nextCursor.set(page.next_cursor);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isLoaded.set(true);
    }
  }
}
