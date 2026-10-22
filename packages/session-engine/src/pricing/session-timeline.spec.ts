import { StateChange } from '../store/session-history-store';
import { SessionTimeline } from './session-timeline';

class Times {
  static at(minute: number): Date {
    return new Date(Date.UTC(2026, 2, 10, 16, 30 + minute));
  }

  static change(minute: number, toStatus: StateChange['toStatus'], event: string): StateChange {
    return { fromStatus: null, toStatus, event, occurredAt: Times.at(minute) };
  }

  static minutes(periods: { from: Date; to: Date }[]): [number, number][] {
    const base = Times.at(0).getTime();
    return periods.map((period) => [
      (period.from.getTime() - base) / 60_000,
      (period.to.getTime() - base) / 60_000,
    ]);
  }
}

describe('SessionTimeline', () => {
  it('reads charging and idle time from the state history, and idle after the stop until unplugged', () => {
    const history = [
      Times.change(0, 'charging', 'transaction_started'),
      Times.change(20, 'suspended', 'suspended'),
      Times.change(25, 'charging', 'resumed'),
      Times.change(40, 'idle', 'energy_stopped'),
      Times.change(50, 'stopping', 'transaction_ended'),
    ];

    const periods = SessionTimeline.periods(history, {
      startedAt: Times.at(0),
      endedAt: Times.at(50),
      idleUntil: Times.at(70),
    });

    expect(Times.minutes(periods.chargingPeriods)).toEqual([
      [0, 20],
      [25, 40],
    ]);
    expect(Times.minutes(periods.idlePeriods)).toEqual([
      [40, 50],
      [50, 70],
    ]);
  });

  it('counts a running session as charging until now when it has no history', () => {
    const periods = SessionTimeline.periods([], {
      startedAt: Times.at(0),
      endedAt: Times.at(30),
      idleUntil: null,
    });

    expect(Times.minutes(periods.chargingPeriods)).toEqual([[0, 30]]);
    expect(periods.idlePeriods).toEqual([]);
  });

  it('keeps every period inside the transaction, whatever the charger clock said', () => {
    const history = [
      Times.change(-5, 'charging', 'transaction_started'),
      Times.change(45, 'idle', 'energy_stopped'),
    ];

    const periods = SessionTimeline.periods(history, {
      startedAt: Times.at(0),
      endedAt: Times.at(30),
      idleUntil: null,
    });

    expect(Times.minutes(periods.chargingPeriods)).toEqual([[0, 30]]);
    expect(periods.idlePeriods).toEqual([]);
  });
});
