import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { RfidCardsRepository } from '../../drivers/cards/rfid-cards.repository';
import { DriversRepository } from '../../drivers/profiles/drivers.repository';
import { OperatorLinkRecord, OperatorProfileRecord } from './operator-link-record';

/** Gathers what one operator holds about the driver, inside that operator's tenant (module 19). */
@Injectable()
export class OperatorProfileReader {
  constructor(
    private readonly drivers: DriversRepository,
    private readonly cards: RfidCardsRepository,
  ) {}

  async read(tx: Transaction, link: OperatorLinkRecord): Promise<OperatorProfileRecord> {
    const driver = await this.drivers.findById(tx, link.driverId);
    const groups = await this.drivers.findGroupsOf(tx, [link.driverId]);
    const cards = await this.cards.findByDriver(tx, link.driverId);
    return {
      ...link,
      email: driver?.email ?? null,
      phone: driver?.phone ?? null,
      groups: (groups.get(link.driverId) ?? []).map((group) => group.name),
      cards: cards.map((card) => ({ idTag: card.idTag, label: card.label, status: card.status })),
    };
  }
}
