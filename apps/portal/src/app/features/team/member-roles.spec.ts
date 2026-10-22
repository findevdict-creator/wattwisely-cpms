import { Member } from '../../core/api/models/member';
import { MemberRoles } from './member-roles';

describe('MemberRoles', () => {
  const member = {
    roles: [
      { role_id: 'tech', key: 'technician', name: 'Technician', site_ids: ['s1', 's2'] },
      { role_id: 'ro', key: 'read-only', name: 'Read-only', site_ids: null },
    ],
  } as Member;

  it('turns a member’s roles into assignments, keeping their sites', () => {
    expect(MemberRoles.assignmentsOf(member)).toEqual([
      { role_id: 'tech', site_ids: ['s1', 's2'] },
      { role_id: 'ro' },
    ]);
  });

  it('wants at least one role, and a site for every site-scoped role', () => {
    expect(MemberRoles.isComplete([])).toBe(false);
    expect(MemberRoles.isComplete([{ role_id: 'tech', site_ids: [] }])).toBe(false);
    expect(MemberRoles.isComplete([{ role_id: 'tech', site_ids: ['s1'] }, { role_id: 'ro' }])).toBe(
      true,
    );
  });

  it('describes roles for the team list', () => {
    expect(MemberRoles.describe(member)).toBe('Technician (2 sites), Read-only');
  });
});
