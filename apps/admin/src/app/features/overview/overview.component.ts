import { Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Overview } from '../../core/api/models/overview';
import { OverviewApiService } from '../../core/api/overview-api.service';

/** The first page: how many tenants, connectors and staff the platform has, and plan uptake. */
@Component({
  selector: 'ww-overview',
  imports: [MatCardModule, MatTableModule, RouterLink],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
})
export class OverviewComponent implements OnInit {
  private readonly overviewApi = inject(OverviewApiService);

  protected readonly overview = signal<Overview | null>(null);
  protected readonly error = signal('');
  protected readonly planColumns = ['plan', 'tenants'];

  async ngOnInit(): Promise<void> {
    try {
      this.overview.set(await firstValueFrom(this.overviewApi.getOverview()));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}
