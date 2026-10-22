import { SessionState, SessionStates } from '@wattwisely/session-engine';
import { PermissionKey } from '../../common/permissions/permission-catalog';
import { SitePermissionChecker } from '../../common/permissions/site-permission.checker';
import { TenantAccess } from '../../common/tenant/tenant-access';
import { ListSessionsQueryDto } from './dto/list-sessions-query.dto';
import { SessionErrors } from './session-errors';
import { SessionFilter } from './session-filter';

/** Turns a list query into a filter, limited to the sites where the caller holds the permission. */
export class SessionFilters {
  static of(access: TenantAccess, key: PermissionKey, query: ListSessionsQueryDto): SessionFilter {
    return {
      scope: SitePermissionChecker.scopeOf(access, key),
      siteId: query.site_id,
      chargerId: query.charger_id,
      statuses: query.status ? SessionFilters.statusesOf(query.status) : undefined,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      isReviewNeeded: query.needs_review === 'true',
    };
  }

  private static statusesOf(text: string): SessionState[] {
    const values = text.split(',');
    const unknown = values.find((value) => !SessionStates.isState(value));
    if (unknown !== undefined) {
      throw SessionErrors.invalidStatus(unknown);
    }
    return values as SessionState[];
  }
}
