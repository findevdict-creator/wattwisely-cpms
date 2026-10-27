import { Role } from '../../core/api/models/role';
import { RoleForm } from './role-form';

describe('RoleForm', () => {
  const technician: Role = {
    id: 'r1',
    key: 'technician',
    name: 'Technician',
    description: 'Fixes chargers',
    is_system: true,
    permissions: ['chargers:read', 'chargers:command'],
    member_count: 1,
    version: 1,
    created_at: '',
    updated_at: '',
  };

  it('needs a name and at least one permission', () => {
    const form = new RoleForm();
    expect(form.isValid()).toBe(false);
    form.fields.patchValue({ name: 'Depot supervisor' });
    expect(form.isValid()).toBe(false);
    form.set('chargers:read', true);
    expect(form.isValid()).toBe(true);
  });

  it('starts from another role, then ticks and clears permissions one by one or by module', () => {
    const form = new RoleForm();
    form.copyFrom(technician);
    form.set('drivers:read', true);
    form.set('chargers:command', false);
    expect(form.permissions()).toEqual(['chargers:read', 'drivers:read']);

    form.setAll(['sites:read', 'sites:write'], true);
    expect(form.hasAll(['sites:read', 'sites:write'])).toBe(true);
    form.setAll(['sites:read', 'sites:write'], false);
    expect(form.hasSome(['sites:read', 'sites:write'])).toBe(false);
    expect(form.hasAll([])).toBe(false);
  });

  it('loads a role for editing and sends trimmed fields', () => {
    const form = RoleForm.from(technician);
    form.fields.patchValue({ name: '  Field technician ', description: ' Out and about ' });

    expect(form.toInput()).toEqual({
      name: 'Field technician',
      description: 'Out and about',
      permissions: ['chargers:read', 'chargers:command'],
    });
  });
});
