import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MeApiService } from '../api/me-api.service';
import { Me } from '../api/models/me';
import { StaffContextService } from './staff-context.service';

describe('StaffContextService', () => {
  const serviceWith = async (me: Me) => {
    TestBed.configureTestingModule({
      providers: [{ provide: MeApiService, useValue: { getMe: () => of(me) } }],
    });
    const service = TestBed.inject(StaffContextService);
    await service.ensureLoaded();
    return service;
  };
  const person = { id: 'u1', email: 'ana@wattwisely.test', name: 'Ana' };

  it('knows a staff member’s role and permissions', async () => {
    const service = await serviceWith({
      ...person,
      is_platform_staff: true,
      platform: { role: 'billing', permissions: ['tenants:read', 'plans:write'] },
    });

    expect(service.isStaff()).toBe(true);
    expect(service.roleName()).toBe('billing');
    expect(service.can('plans:write')).toBe(true);
    expect(service.can('staff:manage')).toBe(false);
  });

  it('treats everyone else as not staff', async () => {
    const service = await serviceWith({ ...person, is_platform_staff: false, platform: null });

    expect(service.isStaff()).toBe(false);
    expect(service.can('tenants:read')).toBe(false);
  });
});
