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

  it('asks for a reload on status and connection changes, not on session ticks', () => {
    expect(LiveEventApplier.needsReload(event('connector.status', {}))).toBe(true);
    expect(LiveEventApplier.needsReload(event('charger.disconnected', {}))).toBe(true);
    expect(LiveEventApplier.needsReload(event('session.updated', {}))).toBe(false);
    expect(LiveEventApplier.needsReload(event('command.result', {}))).toBe(false);
  });

  it('puts a running session on its connector and takes it off when it ends', () => {
    const running = LiveEventApplier.apply(
      charger,
      event('session.updated', {
        connector_id: 'c1',
        session_id: 's1',
        status: 'charging',
        energy_wh: 1500,
      }),
    );
    expect(running.connectors[0].active_session).toEqual({
      id: 's1',
      ocpp_transaction_id: 0,
      started_at: '2026-01-01T10:00:00Z',
      energy_wh: 1500,
    });
    const ended = LiveEventApplier.apply(
      running,
      event('session.updated', {
        connector_id: 'c1',
        session_id: 's1',
        status: 'ended',
        energy_wh: 2000,
      }),
    );
    expect(ended.connectors[0].active_session).toBeNull();
    expect(LiveEventApplier.apply(charger, event('command.result', {}))).toBe(charger);
  });
});
