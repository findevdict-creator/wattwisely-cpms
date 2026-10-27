import { AdminMenu } from './admin-menu';

describe('AdminMenu', () => {
  it('shows a role only the pages its permissions open', () => {
    const groups = AdminMenu.visible((permission) => permission === 'billing:read');
    expect(groups.map((group) => group.items.map((item) => item.label))).toEqual([
      ['Overview', 'Tenants'],
      ['Invoices'],
    ]);
  });

  it('marks Overview on its own page only, the others on the pages under them', () => {
    const [overview, tenants] = AdminMenu.GROUPS[0].items;
    expect(AdminMenu.isActive(overview, '/')).toBe(true);
    expect(AdminMenu.isActive(overview, '/tenants')).toBe(false);
    expect(AdminMenu.isActive(tenants, '/tenants/t1/service-report?month=2026-09')).toBe(true);
  });

  it('names where you are for the top bar', () => {
    expect(AdminMenu.where('/')).toEqual({ section: 'Staff console', page: 'Overview' });
    expect(AdminMenu.where('/tenants')).toEqual({ section: 'Staff console', page: 'Tenants' });
    expect(AdminMenu.where('/plans')).toEqual({ section: 'Platform', page: 'Plans' });
    expect(AdminMenu.where('/tenants/t1', 'Acme Charging')).toEqual({
      section: 'Tenants',
      page: 'Acme Charging',
    });
  });
});
