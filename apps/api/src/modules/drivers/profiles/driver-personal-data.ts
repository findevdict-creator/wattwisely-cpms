import { TenantAccess } from '../../../common/tenant/tenant-access';
import { DriverSummary } from './driver-record';

/**
 * E-mail and phone are personal data (story DRV-02): shown only to roles holding
 * drivers:read_personal. Everyone else gets null and is_personal_data_hidden. The addresses
 * of the driver's login and of an open invitation (module 19) are hidden the same way.
 */
export class DriverPersonalData {
  static isVisibleTo(access: TenantAccess): boolean {
    return access.permissions.can('drivers:read_personal');
  }

  static shownTo(
    access: TenantAccess,
    driver: DriverSummary,
  ): DriverSummary & { isHidden: boolean } {
    if (DriverPersonalData.isVisibleTo(access)) {
      return { ...driver, isHidden: false };
    }
    const invitation = driver.invitation && { ...driver.invitation, email: '' };
    return { ...driver, email: null, phone: null, accountEmail: null, invitation, isHidden: true };
  }
}
