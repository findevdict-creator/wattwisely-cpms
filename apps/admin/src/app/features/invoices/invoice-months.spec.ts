import { InvoiceMonths } from './invoice-months';

describe('InvoiceMonths', () => {
  it('offers this month and the eleven before it, newest first, across the turn of the year', () => {
    const months = InvoiceMonths.past(new Date('2026-02-10T12:00:00Z'));

    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ key: '2026-02', label: 'February 2026' });
    expect(months[1]).toEqual({ key: '2026-01', label: 'January 2026' });
    expect(months[2]).toEqual({ key: '2025-12', label: 'December 2025' });
    expect(months[11]).toEqual({ key: '2025-03', label: 'March 2025' });
  });
});
