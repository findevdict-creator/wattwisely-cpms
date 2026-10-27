import { ModuleCatalog, ModuleDefinition } from '../permissions/module-catalog';

/** The plan a tenant is on, as far as access control needs it. */
export interface PlanSummary {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly connectorLimit: number | null;
  readonly userLimit: number | null;
  readonly moduleKeys: readonly string[];
}

/** One tenant_entitlements row: a module beyond (or taken from) the plan. */
export interface EntitlementRecord {
  readonly featureKey: string;
  readonly source: 'addon' | 'trial' | 'override';
  readonly isEnabled: boolean;
  readonly endsAt: Date | null;
}

/** Why a tenant has a module right now. */
export type ModuleSource = 'core' | 'plan' | 'addon' | 'trial' | 'override';

/**
 * Which modules one tenant can use (Architecture, section 6): the core modules always,
 * the plan's modules, and whatever add-ons, trials and overrides say on top. A tenant
 * without a plan yet has the core modules only. An entitlement that has ended counts
 * for nothing; an override with is_enabled false takes a module away from the plan.
 */
export class TenantEntitlements {
  private readonly sources = new Map<string, ModuleSource>();

  constructor(
    readonly plan: PlanSummary | null,
    readonly subscriptionStatus: string | null,
    readonly entitlements: readonly EntitlementRecord[],
    now: Date = new Date(),
  ) {
    for (const module of ModuleCatalog.ENTRIES) {
      const source = this.sourceFor(module, now);
      if (source) {
        this.sources.set(module.key, source);
      }
    }
  }

  /** The core modules only: a tenant nobody has put on a plan. */
  static none(): TenantEntitlements {
    return new TenantEntitlements(null, null, []);
  }

  isModuleEnabled(moduleKey: string): boolean {
    return this.sources.has(moduleKey);
  }

  /** True when the module exists but this tenant cannot use it. */
  isModuleLocked(moduleKey: string): boolean {
    return ModuleCatalog.isKnown(moduleKey) && !this.isModuleEnabled(moduleKey);
  }

  isPermissionLocked(permissionKey: string): boolean {
    const module = ModuleCatalog.moduleOf(permissionKey);
    return module ? this.isModuleLocked(module.key) : false;
  }

  sourceOf(moduleKey: string): ModuleSource | null {
    return this.sources.get(moduleKey) ?? null;
  }

  lockedModuleKeys(): string[] {
    return ModuleCatalog.gated()
      .map((module) => module.key)
      .filter((key) => this.isModuleLocked(key));
  }

  private sourceFor(module: ModuleDefinition, now: Date): ModuleSource | null {
    if (module.kind === 'core') {
      return 'core';
    }
    const entitlement = this.entitlements.find(
      (row) => row.featureKey === module.key && (!row.endsAt || row.endsAt > now),
    );
    if (entitlement) {
      return entitlement.isEnabled ? entitlement.source : null;
    }
    return this.plan?.moduleKeys.includes(module.key) ? 'plan' : null;
  }
}
