import { Permission } from '../../../core/api/models/role';
import { ApiKeyForm } from './api-key-form';

describe('ApiKeyForm', () => {
  const permission = (key: string): Permission => ({
    key,
    area: key.split(':')[0],
    label: key,
    is_read_only: true,
    module: key.split(':')[0],
    module_name: key.split(':')[0],
    is_locked: false,
  });

  it('leaves out the permissions a key cannot hold', () => {
    const selectable = ApiKeyForm.selectable([
      permission('sites:read'),
      permission('api_keys:manage'),
      permission('sessions:read'),
    ]);
    expect(selectable.map((entry) => entry.key)).toEqual(['sites:read', 'sessions:read']);
  });

  it('needs a name, at least one permission and an expiry that is not past', () => {
    const form = new ApiKeyForm();
    expect(form.isValid()).toBe(false);
    form.fields.patchValue({ name: 'Fleet sync' });
    expect(form.isValid()).toBe(false);
    form.set('sessions:read', true);
    expect(form.isValid()).toBe(true);
    form.fields.patchValue({ expiresOn: '2020-01-01' });
    expect(form.isExpiryPast()).toBe(true);
    expect(form.isValid()).toBe(false);
    form.fields.patchValue({ expiresOn: '2999-12-31' });
    expect(form.isValid()).toBe(true);
  });

  it('ticks permissions one by one or by module and sends the body trimmed', () => {
    const form = new ApiKeyForm();
    form.fields.patchValue({ name: '  Fleet sync ', description: ' Nightly ' });
    form.setAll(['sites:read', 'sites:write'], true);
    form.set('sites:write', false);
    form.set('sessions:read', true);

    expect(form.hasSome(['sites:read', 'sites:write'])).toBe(true);
    expect(form.hasAll(['sites:read', 'sites:write'])).toBe(false);
    expect(form.toInput()).toEqual({
      name: 'Fleet sync',
      description: 'Nightly',
      permissions: ['sites:read', 'sessions:read'],
      expires_at: null,
    });
    form.fields.patchValue({ expiresOn: '2999-06-30' });
    expect(form.toInput().expires_at).toMatch(/^2999-06-30T|^2999-07-01T/);
  });
});
