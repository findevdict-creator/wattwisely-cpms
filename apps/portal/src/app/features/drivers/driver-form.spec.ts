import { Driver } from '../../core/api/models/driver';
import { DriverForm } from './driver-form';

describe('DriverForm', () => {
  const driver: Driver = {
    id: 'd1',
    name: 'Dana Driver',
    email: 'dana@example.com',
    phone: null,
    reference: 'EMP-42',
    notes: '',
    status: 'active',
    blocked_at: null,
    blocked_by: null,
    block_reason: '',
    card_count: 1,
    active_card_count: 1,
    last_session_at: null,
    groups: [{ id: 'g1', name: 'Depot staff' }],
    is_personal_data_hidden: false,
    version: 1,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  };

  it('needs a name and a well-formed e-mail', () => {
    const form = new DriverForm();
    expect(form.isValid()).toBe(false);
    form.fields.patchValue({ name: 'Dana', email: 'not-an-address' });
    expect(form.isValid()).toBe(false);
    form.fields.patchValue({ email: '' });
    expect(form.isValid()).toBe(true);
  });

  it('trims the fields and sends blank e-mail and phone as null', () => {
    const form = new DriverForm();
    form.fields.setValue({
      name: '  Dana ',
      email: ' ',
      phone: ' +44 7700 ',
      reference: ' EMP-42 ',
      notes: '',
      groupIds: ['g1'],
    });

    expect(form.toInput()).toEqual({
      name: 'Dana',
      email: null,
      phone: '+44 7700',
      reference: 'EMP-42',
      notes: '',
      group_ids: ['g1'],
    });
  });

  it('loads a driver with their groups', () => {
    const form = DriverForm.from(driver);

    expect(form.fields.getRawValue()).toEqual({
      name: 'Dana Driver',
      email: 'dana@example.com',
      phone: '',
      reference: 'EMP-42',
      notes: '',
      groupIds: ['g1'],
    });
  });
});
