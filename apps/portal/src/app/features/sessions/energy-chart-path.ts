import { SessionReading } from '../../core/api/models/session';

/** The drawing box of the chart, in SVG units. */
export interface ChartBox {
  width: number;
  height: number;
  padding: number;
}

/**
 * Turns a session's readings into an SVG path: time along the bottom, energy delivered
 * up the side, from zero to the most energy delivered. Readings without energy are skipped.
 */
export class EnergyChartPath {
  static of(readings: SessionReading[], box: ChartBox): string {
    const points = readings.filter((reading) => reading.energy_wh !== null);
    if (points.length < 2) {
      return '';
    }
    const times = points.map((point) => new Date(point.at).getTime());
    const first = times[0];
    const span = Math.max(1, times[times.length - 1] - first);
    const top = Math.max(1, EnergyChartPath.maxWh(points));
    const innerWidth = box.width - 2 * box.padding;
    const innerHeight = box.height - 2 * box.padding;
    return points
      .map((point, index) => {
        const x = box.padding + ((times[index] - first) / span) * innerWidth;
        const y = box.padding + innerHeight - ((point.energy_wh as number) / top) * innerHeight;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  static maxWh(readings: SessionReading[]): number {
    return Math.max(0, ...readings.map((reading) => reading.energy_wh ?? 0));
  }
}
