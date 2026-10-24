/**
 * The name of an add-on on an invoice line. The API's ModuleCatalog is the source of truth
 * for module names; the worker has no access to it, so the two add-ons are named here too
 * and a test in the API keeps the two in step. An unknown key is spelled out from the key.
 */
export class AddonNames {
  static readonly KNOWN: Record<string, string> = {
    load_management: 'Load management',
    messaging_charging: 'Messaging-app charging',
  };

  static of(key: string): string {
    const known = AddonNames.KNOWN[key];
    if (known) {
      return known;
    }
    const words = key.replace(/_/g, ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
}
