import { IdTagStatus } from '../adapters/v16/v16-messages';
import { CardAccess } from './card-access';

/**
 * The OCPP answer for a registered card (module 13, story AST-04). A card that is not
 * registered is Invalid; a blocked or lost card, or a blocked driver, is Blocked; a card
 * past its end date is Expired; a private site admits only the drivers of a group that
 * names it, and answers Invalid to everyone else (OCPP has no "not here" status).
 */
export class TagVerdict {
  static of(access: CardAccess | null, now: Date = new Date()): IdTagStatus {
    if (!access || access.isDriverDeleted) {
      return 'Invalid';
    }
    if (access.cardStatus !== 'active' || access.driverStatus !== 'active') {
      return 'Blocked';
    }
    if (access.expiresAt && access.expiresAt.getTime() <= now.getTime()) {
      return 'Expired';
    }
    if (access.visibility === 'private' && !access.isMemberAtSite) {
      return 'Invalid';
    }
    return 'Accepted';
  }
}
