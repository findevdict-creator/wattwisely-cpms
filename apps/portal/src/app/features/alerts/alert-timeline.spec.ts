import { Alert } from '../../core/api/models/alert';
import { AlertTimeline } from './alert-timeline';

describe('AlertTimeline', () => {
  const alert: Alert = {
    id: 'a1',
    type: 'connector_faulted',
    status: 'open',
    title: 'Connector A faulted: GroundFailure',
    details: {},
    site_id: 's1',
    site_name: 'Riverside',
    charger_id: 'c1',
    charger_identity: 'CP-07',
    connector_id: null,
    session_id: null,
    began_at: '2026-10-27T09:06:00Z',
    opened_at: '2026-10-27T09:06:00Z',
    last_seen_at: '2026-10-27T09:18:00Z',
    occurrences: 1,
    acknowledged_by: null,
    acknowledged_at: null,
    acknowledge_note: '',
    closed_at: null,
    close_reason: null,
    version: 1,
  };

  it('starts with the problem itself', () => {
    expect(AlertTimeline.of(alert)).toEqual([
      expect.objectContaining({ title: 'Connector faulted', text: alert.title }),
    ]);
  });

  it('adds what people and the charger did, newest first', () => {
    const steps = AlertTimeline.of({
      ...alert,
      status: 'closed',
      occurrences: 3,
      acknowledged_by: 'Tom Reyes',
      acknowledged_at: '2026-10-27T09:10:00Z',
      acknowledge_note: 'On my way',
      closed_at: '2026-10-27T11:00:00Z',
    });
    expect(steps.map((step) => step.title)).toEqual([
      'Cleared',
      'Came back',
      'Acknowledged by Tom Reyes',
      'Connector faulted',
    ]);
    expect(steps[2].text).toBe('“On my way”');
  });
});
