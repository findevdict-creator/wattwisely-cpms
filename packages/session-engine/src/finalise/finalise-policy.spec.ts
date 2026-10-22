import { SessionRow } from '../store/session-row';
import { FinalisePolicy } from './finalise-policy';

class Sessions {
  static readonly NOW = new Date('2026-03-10T20:00:00Z');

  static stopping(endedAt: string | null, unpluggedAt: string | null): SessionRow {
    return {
      status: 'stopping',
      endedAt: endedAt ? new Date(endedAt) : null,
      unpluggedAt: unpluggedAt ? new Date(unpluggedAt) : null,
    } as SessionRow;
  }
}

describe('FinalisePolicy', () => {
  it('prices a session as soon as it has stopped and the car has left', () => {
    const session = Sessions.stopping('2026-03-10T19:00:00Z', '2026-03-10T19:30:00Z');

    expect(FinalisePolicy.isDue(session, Sessions.NOW)).toBe(true);
    expect(FinalisePolicy.idleUntil(session, Sessions.NOW).toISOString()).toBe(
      '2026-03-10T19:30:00.000Z',
    );
  });

  it('waits up to four hours for the car to leave, and counts idle time up to then', () => {
    const recent = Sessions.stopping('2026-03-10T18:00:00Z', null);
    const old = Sessions.stopping('2026-03-10T15:00:00Z', null);

    expect(FinalisePolicy.isDue(recent, Sessions.NOW)).toBe(false);
    expect(FinalisePolicy.isDue(old, Sessions.NOW)).toBe(true);
    expect(FinalisePolicy.idleUntil(old, Sessions.NOW).toISOString()).toBe(
      '2026-03-10T19:00:00.000Z',
    );
  });

  it('waits four hours for a StopTransaction after an unplug', () => {
    expect(
      FinalisePolicy.isDue(Sessions.stopping(null, '2026-03-10T17:00:00Z'), Sessions.NOW),
    ).toBe(false);
    expect(
      FinalisePolicy.isDue(Sessions.stopping(null, '2026-03-10T15:00:00Z'), Sessions.NOW),
    ).toBe(true);
  });

  it('only prices stopped sessions', () => {
    const charging = {
      ...Sessions.stopping('2026-03-10T19:00:00Z', '2026-03-10T19:30:00Z'),
      status: 'charging',
    } as SessionRow;

    expect(FinalisePolicy.isDue(charging, Sessions.NOW)).toBe(false);
  });
});
