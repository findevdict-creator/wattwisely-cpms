import { randomInt } from 'node:crypto';

/**
 * The idTag the platform hands a charger in RemoteStartTransaction. OCPP 1.6 allows
 * 20 characters; the WW prefix tells a platform-issued token from a driver's RFID card.
 * The gateway accepts Authorize and StartTransaction for a tag it issued itself.
 */
export class RemoteStartTag {
  static readonly PREFIX = 'WW';
  static readonly LENGTH = 20;
  static readonly ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  static generate(): string {
    let tag = RemoteStartTag.PREFIX;
    while (tag.length < RemoteStartTag.LENGTH) {
      tag += RemoteStartTag.ALPHABET[randomInt(RemoteStartTag.ALPHABET.length)];
    }
    return tag;
  }
}
