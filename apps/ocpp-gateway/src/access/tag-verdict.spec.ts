import { CardAccess } from './card-access';
import { TagVerdict } from './tag-verdict';

/** Which OCPP status a registered card gets, in order of precedence. */
describe('TagVerdict', () => {
  const now = new Date('2026-10-24T12:00:00Z');
  const card = (changes: Partial<CardAccess> = {}): CardAccess => ({
    cardId: 'card',
    driverId: 'driver',
    cardStatus: 'active',
    expiresAt: null,
    driverStatus: 'active',
    isDriverDeleted: false,
    visibility: 'public',
    isMemberAtSite: false,
    ...changes,
  });

  it('accepts an active card of an active driver at a public site', () => {
    expect(TagVerdict.of(card(), now)).toBe('Accepted');
  });

  it('answers Invalid for a tag that is no card, or a deleted driver', () => {
    expect(TagVerdict.of(null, now)).toBe('Invalid');
    expect(TagVerdict.of(card({ isDriverDeleted: true }), now)).toBe('Invalid');
  });

  it('blocks a blocked or lost card, and every card of a blocked driver', () => {
    expect(TagVerdict.of(card({ cardStatus: 'blocked' }), now)).toBe('Blocked');
    expect(TagVerdict.of(card({ cardStatus: 'lost' }), now)).toBe('Blocked');
    expect(TagVerdict.of(card({ driverStatus: 'blocked' }), now)).toBe('Blocked');
  });

  it('answers Expired from the end date on, and Accepted before it', () => {
    expect(TagVerdict.of(card({ expiresAt: now }), now)).toBe('Expired');
    expect(TagVerdict.of(card({ expiresAt: new Date('2026-10-25T00:00:00Z') }), now)).toBe(
      'Accepted',
    );
  });

  it('admits only group members at a private site', () => {
    expect(TagVerdict.of(card({ visibility: 'private' }), now)).toBe('Invalid');
    expect(TagVerdict.of(card({ visibility: 'private', isMemberAtSite: true }), now)).toBe(
      'Accepted',
    );
  });

  it('puts a block before an expiry, and an expiry before the site rule', () => {
    expect(TagVerdict.of(card({ cardStatus: 'blocked', expiresAt: now }), now)).toBe('Blocked');
    expect(TagVerdict.of(card({ visibility: 'private', expiresAt: now }), now)).toBe('Expired');
  });
});
