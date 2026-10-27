import { Site } from '../../core/api/models/site';
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

  it('says where a member’s roles apply', () => {
    const sites = [
      { id: 's1', name: 'Riverside' },
      { id: 's2', name: 'Depot' },
    ] as Site[];
    expect(MemberRoles.where(member, sites)).toBe('Whole company');
    const scoped = { roles: [member.roles[0]] } as Member;
    expect(MemberRoles.where(scoped, sites)).toBe('Riverside, Depot');
    const wide = { roles: [{ ...member.roles[0], site_ids: ['s1', 's2', 's3'] }] } as Member;
    expect(MemberRoles.where(wide, sites)).toBe('3 sites');
  });
});
