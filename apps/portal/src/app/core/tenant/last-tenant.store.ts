/** Keeps the last tenant the user worked in, so the next login lands there. */
export class LastTenantStore {
  static readonly KEY = 'wattwisely.last-tenant-id';

  read(): string | null {
    return localStorage.getItem(LastTenantStore.KEY);
  }

  write(tenantId: string): void {
    localStorage.setItem(LastTenantStore.KEY, tenantId);
  }

  clear(): void {
    localStorage.removeItem(LastTenantStore.KEY);
  }
}
