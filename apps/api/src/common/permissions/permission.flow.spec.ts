import { Type } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { ModulesContainer } from '@nestjs/core';
import { TestData, TestDatabase, TestPerson, TestPlatform } from '@wattwisely/db/testing';
import { RouteAccess } from '../auth/route-access.decorator';
import { PlatformPermissionCatalog } from '../platform/platform-permission-catalog';
import { TestApi } from '../../testing/test-api';
import { PermissionCatalog } from './permission-catalog';

/** Finds controller routes without a RouteAccess marker or with an unknown permission. */
class RouteDeclarations {
  static undeclared(modules: ModulesContainer): string[] {
    return [...modules.values()]
      .flatMap((module) => [...module.controllers.values()])
      .flatMap(({ metatype }) =>
        metatype ? RouteDeclarations.inController(metatype as Type) : [],
      );
  }

  private static inController(controller: Type): string[] {
    const prototype = controller.prototype;
    return Object.getOwnPropertyNames(prototype)
      .filter((name) => name !== 'constructor')
      .filter((name) => Reflect.getMetadata(PATH_METADATA, prototype[name]) !== undefined)
      .filter((name) => !RouteDeclarations.isDeclared(controller, prototype[name]))
      .map((name) => `${controller.name}.${name}`);
  }

  private static isDeclared(controller: Type, handler: object): boolean {
    const read = (key: string) =>
      Reflect.getMetadata(key, handler) ?? Reflect.getMetadata(key, controller);
    const permission = read(RouteAccess.PERMISSION_KEY);
    return Boolean(
      read(RouteAccess.PUBLIC_KEY) ||
      read(RouteAccess.WITHOUT_TENANT_KEY) ||
      permission === RouteAccess.ANY_MEMBER ||
      PermissionCatalog.isKnown(permission) ||
      PlatformPermissionCatalog.isKnown(read(RouteAccess.PLATFORM_KEY) ?? ''),
    );
  }
}

/** Who may call what: route declarations, role permissions, suspended tenants and the plan. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Permissions', () => {
  const api = new TestApi();
  let site: string;
  let acme: string;
  let paused: string;
  let tess: TestPerson;
  let olivia: TestPerson;
  let owner: TestPerson;

  beforeAll(async () => {
    await api.start();
    acme = await api.data.tenant('acme-charging');
    paused = await api.data.tenant('paused-co', 'suspended');
    site = await api.data.site(acme, 'Riverside');
    tess = await api.data.person('tess@acme.test');
    olivia = await api.data.person('olivia@paused.test');
    owner = await api.data.person('owner@acme.test');
    await api.data.member(acme, tess, TestData.ROLE_IDS.technician, site);
    await api.data.member(paused, olivia, TestData.ROLE_IDS.owner);
    await api.data.member(acme, owner, TestData.ROLE_IDS.owner);
    await api.platform.subscription(acme, TestPlatform.PLAN_IDS.starter);
  });

  afterAll(async () => api.stop());

  it('makes every route declare who may call it, with a known permission', () => {
    expect(RouteDeclarations.undeclared(api.app.get(ModulesContainer))).toEqual([]);
  });

  it('tells the portal my roles and where each permission applies', async () => {
    const response = await api.call('GET', '/v1/me/permissions', {
      token: await api.issuer.signFor(tess),
    });

    expect(response.json()).toMatchObject({
      tenant_id: acme,
      is_read_only: false,
      roles: [{ key: 'technician', site_id: site }],
      plan: { code: 'starter', name: 'Starter' },
      locked_modules: [
        'advanced_reports',
        'custom_roles',
        'api_keys',
        'load_management',
        'messaging_charging',
      ],
    });
    expect(response.json().permissions).toContainEqual({ key: 'chargers:read', site_ids: [site] });
    expect(response.json().permissions).not.toContainEqual(
      expect.objectContaining({ key: 'team:read' }),
    );
  });

  it('refuses a route whose permission the caller lacks', async () => {
    const response = await api.call('GET', '/v1/members', {
      token: await api.issuer.signFor(tess),
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'permission_denied' });
  });

  it('marks the modules the plan lacks as locked until staff switch one on', async () => {
    const token = await api.issuer.signFor(owner);
    const permissions = await api.call('GET', '/v1/permissions', { token });
    const locked = permissions.json().find((p: { key: string }) => p.key === 'api_keys:manage');
    const refused = await api.call('GET', '/v1/admin/tenants', { token });

    await api.platform.entitlement(acme, 'api_keys', 'override');
    const newcomer = await api.data.person('new@acme.test');
    await api.data.member(acme, newcomer, TestData.ROLE_IDS.owner);
    const mine = await api.call('GET', '/v1/me/permissions', {
      token: await api.issuer.signFor(newcomer),
    });

    expect(locked).toMatchObject({ module: 'api_keys', is_locked: true });
    expect(refused.statusCode).toBe(403);
    expect(refused.json()).toMatchObject({ code: 'not_platform_staff' });
    expect(mine.json().locked_modules).not.toContain('api_keys');
    expect(mine.json().locked_modules).toContain('load_management');
  });

  it('keeps a suspended tenant read-only, even for its owner', async () => {
    const token = await api.issuer.signFor(olivia);

    const read = await api.call('GET', '/v1/members', { token });
    const write = await api.call('POST', '/v1/members/invites', {
      token,
      body: { email: 'new@paused.test', roles: [{ role_id: TestData.ROLE_IDS.readOnly }] },
    });
    const mine = await api.call('GET', '/v1/me/permissions', { token });

    expect(read.statusCode).toBe(200);
    expect(write.statusCode).toBe(403);
    expect(write.json()).toMatchObject({ code: 'tenant_suspended' });
    expect(mine.json()).toMatchObject({ is_read_only: true });
  });
});
