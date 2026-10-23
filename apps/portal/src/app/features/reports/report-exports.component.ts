import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { ReportExport } from '../../core/api/models/report';
import { ReportsApiService } from '../../core/api/reports-api.service';
import { FileDownload } from '../../shared/file-download';

/**
 * Files built in the background (story SES-04): large session exports, audit log exports
 * and scheduled reports. Each can be downloaded for seven days. The list refreshes itself
 * while a file is being built.
 */
@Component({
  selector: 'ww-report-exports',
  imports: [DatePipe, DecimalPipe, MatButtonModule, MatIconModule, MatTableModule],
  templateUrl: './report-exports.component.html',
  styleUrl: './report-exports.component.scss',
})
export class ReportExportsComponent implements OnInit {
  static readonly REFRESH_MS = 5_000;
  static readonly KIND_LABELS: Record<ReportExport['kind'], string> = {
    sessions: 'Sessions',
    usage: 'Usage',
    audit_log: 'Audit log',
  };

  /** The export an e-mail linked to, shown highlighted. */
  readonly highlight = input<string>();

  private readonly reportsApi = inject(ReportsApiService);
  private readonly destroyRef = inject(DestroyRef);
  private timer: ReturnType<typeof setTimeout> | undefined;

  protected readonly columns = ['created_at', 'file', 'status', 'actions'];
  protected readonly exports = signal<ReportExport[]>([]);
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    this.destroyRef.onDestroy(() => clearTimeout(this.timer));
    await this.load();
  }

  async load(): Promise<void> {
    clearTimeout(this.timer);
    try {
      const exports = (await firstValueFrom(this.reportsApi.exports())).items;
      this.exports.set(exports);
      if (exports.some((item) => item.status === 'queued' || item.status === 'running')) {
        this.timer = setTimeout(() => void this.load(), ReportExportsComponent.REFRESH_MS);
      }
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  protected kindLabel(item: ReportExport): string {
    return ReportExportsComponent.KIND_LABELS[item.kind];
  }

  protected async download(item: ReportExport): Promise<void> {
    try {
      FileDownload.save(await firstValueFrom(this.reportsApi.download(item.id)), item.file_name);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}
