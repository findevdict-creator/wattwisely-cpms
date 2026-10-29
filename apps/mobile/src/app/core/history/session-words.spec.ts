import { ChargeHistory } from '@wattwisely/driver-core';
import { ChargingFixtures } from '../charging/charging.fixture';
import { ReceiptFiles } from './receipt-files';
import { SessionRows } from './session-rows';
import { SessionWords } from './session-words';
import { SupportContact } from './support-contact';

describe('the sessions screens’ words', () => {
  const done = ChargingFixtures.charge({
    status: 'completed',
    started_at: '2026-10-21T17:02:00Z',
    ended_at: '2026-10-21T17:43:00Z',
    energy_wh: 22000,
    amount: 880,
  });
  const volthub = ChargingFixtures.charge({
    id: 'session-2',
    tenant_id: 'volthub',
    operator_name: 'VoltHub',
    site_name: 'Mall West P2',
    status: 'completed',
    started_at: '2026-10-18T09:00:00Z',
    ended_at: '2026-10-18T09:55:00Z',
    energy_wh: 31500,
    amount: 1420,
  });
  const september = ChargingFixtures.charge({
    id: 'session-3',
    status: 'completed',
    started_at: '2026-09-30T08:00:00Z',
    ended_at: '2026-09-30T08:30:00Z',
    energy_wh: 10000,
    amount: null,
    is_paid: false,
    payment: null,
  });

  it('writes a charge as the design’s "My sessions" and "Session detail" do', () => {
    expect(SessionWords.title(done)).toBe('21 Oct · Riverside Car Park');
    expect(SessionWords.line(done)).toBe('Acme Charging · 22.0 kWh · 41 min');
    expect(SessionWords.amount(done)).toBe('€8.80');
    expect(SessionWords.amount(september)).toBe('Free');
    expect(SessionWords.heading(done)).toBe('Charge on 21 Oct');
    expect(SessionWords.period(done)).toBe('21 Oct 2026, 18:02 to 18:43 · started from the app');
    expect(SessionWords.link(done)).toEqual(['/sessions', 'session-1']);
    expect(SessionWords.link({ ...done, status: 'charging' })).toEqual(['/charges', 'session-1']);
  });

  it('adds up the latest two months, and narrows them to one operator', () => {
    const charges = [done, volthub, september];
    expect(SessionRows.totals(ChargeHistory.months(charges, ''))).toEqual([
      { label: 'October 2026', amount: '€23.00', line: '54 kWh · 2 charges' },
      { label: 'September 2026', amount: 'Free', line: '10 kWh · 1 charge' },
    ]);
    const acme = SessionRows.months(ChargeHistory.months(charges, 'acme'));
    expect(acme.map((month) => month.rows.map((row) => row.title))).toEqual([
      ['21 Oct · Riverside Car Park'],
      ['30 Sept · Riverside Car Park'],
    ]);
  });

  it('names the receipt’s file by the day and the site', () => {
    expect(ReceiptFiles.fileName(done)).toBe('receipt-2026-10-21-riverside-car-park.pdf');
  });

  it('offers the operator’s phone, else its e-mail, else its help page', () => {
    const branding = ChargingFixtures.BRANDING;
    expect(SupportContact.of({ ...branding, support_phone: '+353 1 555 0100' })).toEqual({
      text: 'Contact Acme Charging · +353 1 555 0100',
      href: 'tel:+35315550100',
    });
    expect(SupportContact.of(branding)?.href).toBe('mailto:help@acme.test');
    const page = { ...branding, support_email: null, support_url: 'https://help.acme.test/ev' };
    expect(SupportContact.of(page)?.text).toBe('Contact Acme Charging · help.acme.test');
    expect(SupportContact.of({ ...page, support_url: null })).toBeNull();
  });
});
