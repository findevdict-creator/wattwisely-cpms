import { Injectable } from '@nestjs/common';

interface IssuedTag {
  commandId: string;
  expiresAt: number;
}

/**
 * The idTags the platform handed out in RemoteStartTransaction, per charger, for a
 * short while. Authorize and StartTransaction with such a tag are accepted; the
 * remote start command that issued it is linked to the session that follows.
 */
@Injectable()
export class IssuedTagRegistry {
  /** A remote start the charger has not acted on after this is forgotten. */
  static readonly TTL_MS = 90_000;

  private readonly tags = new Map<string, IssuedTag>();

  issue(chargerId: string, idTag: string, commandId: string, now = Date.now()): void {
    this.tags.set(IssuedTagRegistry.key(chargerId, idTag), {
      commandId,
      expiresAt: now + IssuedTagRegistry.TTL_MS,
    });
  }

  isIssued(chargerId: string, idTag: string, now = Date.now()): boolean {
    return this.find(chargerId, idTag, now) !== null;
  }

  /** The command behind the tag, forgetting the tag: one remote start, one session. */
  take(chargerId: string, idTag: string, now = Date.now()): string | null {
    const issued = this.find(chargerId, idTag, now);
    this.tags.delete(IssuedTagRegistry.key(chargerId, idTag));
    return issued?.commandId ?? null;
  }

  private find(chargerId: string, idTag: string, now: number): IssuedTag | null {
    const issued = this.tags.get(IssuedTagRegistry.key(chargerId, idTag));
    if (!issued || issued.expiresAt < now) {
      this.tags.delete(IssuedTagRegistry.key(chargerId, idTag));
      return null;
    }
    return issued;
  }

  private static key(chargerId: string, idTag: string): string {
    return `${chargerId}:${idTag}`;
  }
}
