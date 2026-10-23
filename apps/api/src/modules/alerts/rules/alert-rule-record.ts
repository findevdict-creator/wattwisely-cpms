import { AlertType } from '../alert-types';

/** One saved routing rule with the names the settings page shows. */
export interface AlertRuleRecord {
  id: string;
  alertType: AlertType;
  siteId: string | null;
  siteName: string | null;
  roleId: string | null;
  roleName: string | null;
  membershipId: string | null;
  memberName: string | null;
  isEmail: boolean;
  isInPortal: boolean;
}

/** A rule to save. */
export interface AlertRuleInput {
  alertType: AlertType;
  siteId: string | null;
  roleId: string | null;
  membershipId: string | null;
  isEmail: boolean;
  isInPortal: boolean;
}
