import { AddonNames } from '@wattwisely/billing';
import { ModuleCatalog } from '../../common/permissions/module-catalog';

/** The billing package names add-ons on its own; this keeps its names in step with the module catalog. */
describe('AddonNames', () => {
  it('names every gated module as the portal does', () => {
    const addons = ModuleCatalog.gated().filter((module) => module.kind === 'addon');
    expect(addons.length).toBeGreaterThan(0);
    for (const module of addons) {
      expect(AddonNames.of(module.key)).toBe(module.name);
    }
  });
});
