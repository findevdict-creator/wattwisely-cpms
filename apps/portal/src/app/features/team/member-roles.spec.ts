import { Member } from '../../core/api/models/member';
import { MemberRoles } from './member-roles';

describe('MemberRoles', () => {
  const member = {
    roles: [
      { role_id: 'tech', key: 'technician', name: 'Technician', site_ids: ['s1', 's2'] },
      { role_id: 'ro', key: 'read-only', name: 'Read-only', site_ids: null },
    ],
  } as Member;

  it('keeps the sites a member already has for a role', () => {
    expect(MemberRoles.assignments(['tech', 'fin'], member)).toEqual([
      { role_id: 'tech', site_ids: ['s1', 's2'] },
      { role_id: 'fin' },
    ]);
  });

  it('describes roles for the team list', () => {
    expect(MemberRoles.describe(member)).toBe('Technician (2 sites), Read-only');
  });
});
