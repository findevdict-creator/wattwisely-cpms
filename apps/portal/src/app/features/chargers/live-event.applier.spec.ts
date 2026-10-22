import { ChargerEvent } from '../../core/api/models/charger-event';
import { Charger, Connector } from '../../core/api/models/charger';
import { LiveEventApplier } from './live-event.applier';

describe('LiveEventApplier', () => {
  const connector = { id: 'c1', status: 'charging', active_session: null } as unknown as Connector;
  const charger = { id: 'ch1', connectors: [connector] } as unknown as Charger;
  const event = (type: ChargerEvent['type'], data: Record<string, unknown>): ChargerEvent => ({
    type,
    tenant_id: 't',
    charger_id: 'ch1',
    at: '2026-01-01T10:00:00Z',
    data,
  });
  const session = (status: string, extra: Record<string, unknown> = {}) => ({
    connector_id: 'c1',
    session_id: 's1',
    status,
    energy_wh: 1500,
    gross_amount: null,
    currency: 'GBP',
    ...extra,
  });

  it('asks for a reload on status and connection changes, not on session ticks', () => {
    expect(LiveEventApplier.needsReload(event('connector.status', {}))).toBe(true);
    expect(LiveEventApplier.needsReload(event('charger.disconnected', {}))).toBe(true);
    expect(LiveEventApplier.needsReload(event('session.updated', {}))).toBe(false);
    expect(LiveEventApplier.needsReload(event('session.cost_updated', {}))).toBe(false);
    expect(LiveEventApplier.needsReload(event('command.result', {}))).toBe(false);
  });

  it('puts a running session on its connector, with its cost so far', () => {
    const running = LiveEventApplier.apply(charger, event('session.updated', session('charging')));
    expect(running.connectors[0].active_session).toEqual({
      id: 's1',
      ocpp_transaction_id: 0,
      status: 'charging',
      started_at: '2026-01-01T10:00:00Z',
      energy_wh: 1500,
      gross_amount: null,
      currency: 'GBP',
    });

    const costed = LiveEventApplier.apply(
      running,
      event('session.cost_updated', session('idle', { energy_wh: 2000, gross_amount: 640 })),
    );
    expect(costed.connectors[0].active_session).toMatchObject({
      status: 'idle',
      energy_wh: 2000,
      gross_amount: 640,
    });
  });

  it('keeps a stopped session until it is priced, then takes it off', () => {
    const running = LiveEventApplier.apply(charger, event('session.updated', session('charging')));
    const stopping = LiveEventApplier.apply(running, event('session.updated', session('stopping')));
    expect(stopping.connectors[0].active_session?.status).toBe('stopping');

    const completed = LiveEventApplier.apply(
      stopping,
      event('session.updated', session('completed', { gross_amount: 880 })),
    );
    expect(completed.connectors[0].active_session).toBeNull();
    expect(LiveEventApplier.apply(charger, event('command.result', {}))).toBe(charger);
  });
});
