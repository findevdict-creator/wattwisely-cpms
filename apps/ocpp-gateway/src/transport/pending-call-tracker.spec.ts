import { PendingCallTracker } from './pending-call-tracker';

describe('PendingCallTracker', () => {
  it('hands a result or error to the waiting call and reports its action', async () => {
    const tracker = new PendingCallTracker();
    const result = tracker.track('a', 'Reset', 1000);
    const error = tracker.track('b', 'UnlockConnector', 1000);

    expect(tracker.resolve({ type: 'call_result', id: 'a', payload: { status: 'Accepted' } })).toBe(
      'Reset',
    );
    expect(
      tracker.resolve({
        type: 'call_error',
        id: 'b',
        code: 'NotSupported',
        description: 'no',
        details: {},
      }),
    ).toBe('UnlockConnector');
    expect(tracker.resolve({ type: 'call_result', id: 'zzz', payload: {} })).toBeNull();
    await expect(result).resolves.toEqual({ kind: 'result', payload: { status: 'Accepted' } });
    await expect(error).resolves.toMatchObject({ kind: 'error', code: 'NotSupported' });
    expect(tracker.size).toBe(0);
  });

  it('times out a call nobody answers, and closes the rest when the socket goes', async () => {
    const tracker = new PendingCallTracker();
    const slow = tracker.track('a', 'Reset', 20);
    const orphan = tracker.track('b', 'Reset', 10_000);
    await expect(slow).resolves.toEqual({ kind: 'timeout' });
    tracker.closeAll();
    await expect(orphan).resolves.toEqual({ kind: 'closed' });
  });
});
