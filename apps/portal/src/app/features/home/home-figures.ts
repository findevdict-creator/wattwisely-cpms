import { KpiTrend } from '@wattwisely/ui';
import { Overview, UsageReport } from '../../core/api/models/report';
import { UsageFigures } from '../reports/usage-figures';
import { Change, HomePeriod, PeriodKey } from './home-period';

/** The home page's headline figures, as the KPI cards show them. */
export class HomeFigures {
  constructor(
    private readonly current: UsageReport | null,
    private readonly previous: UsageReport | null,
    private readonly period: PeriodKey,
  ) {}

  get energy(): string {
    return this.current ? UsageFigures.energy(this.current.totals.energy_wh) : '—';
  }

  get energyChange(): Change {
    return this.change((report) => report.totals.energy_wh);
  }

  get sessions(): string {
    return this.current ? this.current.totals.sessions.toLocaleString() : '—';
  }

  get sessionsChange(): Change {
    return this.change((report) => report.totals.sessions);
  }

  get revenue(): string {
    return this.current ? UsageFigures.revenue(this.current.totals.revenue) : '—';
  }

  /** Compared only when both periods took one and the same currency. */
  get revenueChange(): Change {
    const [now, before] = [this.current?.totals.revenue, this.previous?.totals.revenue];
    const isComparable =
      now?.length === 1 && before?.length === 1 && now[0].currency === before[0].currency;
    return isComparable
      ? HomePeriod.change(now[0].amount, before[0].amount, this.period)
      : { text: '', trend: 'none' };
  }

  /** "last 7 days", "today". */
  get periodWords(): string {
    return this.period === 'today' ? 'today' : `last ${this.period === '7d' ? 7 : 30} days`;
  }

  static online(overview: Overview | null): string {
    if (!overview || overview.chargers === 0) {
      return '—';
    }
    return `${Math.round((overview.chargers_online / overview.chargers) * 100)}%`;
  }

  static offline(overview: Overview | null): { text: string; trend: KpiTrend; icon: string } {
    if (!overview || overview.chargers === 0) {
      return { text: '', trend: 'none', icon: '' };
    }
    const offline = overview.chargers - overview.chargers_online;
    return offline > 0
      ? { text: `${offline} offline now`, trend: 'down', icon: 'wifi-off' }
      : { text: 'All online', trend: 'up', icon: 'circle-check' };
  }

  private change(figure: (report: UsageReport) => number): Change {
    return this.current && this.previous
      ? HomePeriod.change(figure(this.current), figure(this.previous), this.period)
      : { text: '', trend: 'none' };
  }
}
