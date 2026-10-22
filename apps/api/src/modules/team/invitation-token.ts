import { createHash, randomBytes } from 'node:crypto';

/**
 * The secret in an invitation link. Only its SHA-256 hash is stored, so a copy of
 * the database is not enough to accept someone else's invitation.
 */
export class InvitationToken {
  static readonly BYTES = 32;
  static readonly VALID_DAYS = 7;

  private constructor(
    readonly value: string,
    readonly hash: string,
  ) {}

  static create(): InvitationToken {
    const value = randomBytes(InvitationToken.BYTES).toString('base64url');
    return new InvitationToken(value, InvitationToken.hashOf(value));
  }

  static hashOf(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  static expiresAt(now: Date = new Date()): Date {
    return new Date(now.getTime() + InvitationToken.VALID_DAYS * 24 * 60 * 60 * 1000);
  }
}
