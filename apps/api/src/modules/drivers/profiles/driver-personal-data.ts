import { TenantAccess } from '../../../common/tenant/tenant-access';
import { DriverSummary } from './driver-record';

/**
 * E-mail and phone are personal data (story DRV-02): shown only to roles holding
 * drivers:read_personal. Everyone else gets null and is_personal_data_hidden.
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
    return { ...driver, email: null, phone: null, isHidden: true };
  }
}
