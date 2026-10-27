import { SessionDetail, SessionReading } from '../../core/api/models/session';
import { DurationLabel } from '../../shared/duration-label';
import { Money } from '../../shared/money';
import { StatusLabels } from '../../shared/status-labels';

/** A figure over the session page: the number and the line under it. */
export interface SessionFigure {
  value: string;
  foot: string;
}

/** The four figures over a session: energy, how long, the highest power and the total. */
export class SessionFigures {
  static energy(session: SessionDetail): SessionFigure {
    const { meter_start_wh: start, meter_stop_wh: stop } = session;
    const kwh = (wh: number) => (wh / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 });
    return {
      value: `${kwh(session.energy_wh)} kWh`,
      foot:
        start !== null && stop !== null
          ? `Meter ${kwh(start)} to ${kwh(stop)}`
          : 'From the meter values',
    };
  }

  static duration(session: SessionDetail, now = new Date()): SessionFigure {
    const end = session.unplugged_at ?? session.ended_at;
    const value = DurationLabel.between(session.started_at, end, now);
    if (session.unplugged_at) {
      return { value, foot: 'Until the car left' };
    }
    return { value, foot: end ? 'Until the charge stopped' : 'Still going' };
  }

  /** The highest power the charger reported, and the average over the charge. */
  static power(session: SessionDetail, readings: SessionReading[]): SessionFigure {
    const powers = readings.map((reading) => reading.power_w ?? 0);
    const peak = powers.length > 0 ? Math.max(...powers) : 0;
    const hours =
      (Date.parse(session.ended_at ?? new Date().toISOString()) - Date.parse(session.started_at)) /
      3_600_000;
    const average = hours > 0 ? session.energy_wh / hours : 0;
    const kw = (w: number) => `${Math.round(w / 1000)} kW`;
    return peak > 0
      ? { value: kw(peak), foot: `Average ${kw(average)}` }
      : { value: '—', foot: 'The charger reported no power' };
  }

  static total(session: SessionDetail): SessionFigure {
    const value = Money.format(session.gross_amount, session.currency);
    if (!session.is_priced) {
      return { value, foot: session.gross_amount === null ? 'Not priced yet' : 'So far' };
    }
    const payment = session.payment;
    if (payment) {
      return { value, foot: `Card payment ${StatusLabels.payment(payment.status).toLowerCase()}` };
    }
    return { value, foot: session.payment_rule?.words ?? 'Not paid by card' };
  }
}
