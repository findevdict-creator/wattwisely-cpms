import { MeterPoint, PricingUsage } from '@wattwisely/pricing';

/** The made-up session of a preview. */
export interface PreviewSession {
  startedAt: Date;
  endedAt: Date;
  energyWh: number;
  idleMinutes: number;
}

/**
 * The engine's usage for a preview: energy flows evenly from start to stop, sampled every
 * five minutes so a band change never falls inside a long gap, then the car sits idle.
 */
export class PreviewUsage {
  static readonly STEP_MS = 5 * 60 * 1000;

  static of(session: PreviewSession): PricingUsage {
    const { startedAt, endedAt, energyWh } = session;
    const idleUntil = new Date(endedAt.getTime() + session.idleMinutes * 60_000);
    return {
      startedAt,
      endedAt,
      series: PreviewUsage.series(startedAt, endedAt, energyWh),
      chargingPeriods: [{ from: startedAt, to: endedAt }],
      idlePeriods: session.idleMinutes > 0 ? [{ from: endedAt, to: idleUntil }] : [],
      flags: [],
    };
  }

  private static series(from: Date, to: Date, energyWh: number): MeterPoint[] {
    const span = to.getTime() - from.getTime();
    const points: MeterPoint[] = [];
    for (let offset = 0; offset < span; offset += PreviewUsage.STEP_MS) {
      points.push({ at: new Date(from.getTime() + offset), wh: (energyWh * offset) / span });
    }
    points.push({ at: to, wh: energyWh });
    return points;
  }
}
