import { Injectable } from '@nestjs/common';
import { RfidCardsRepository } from './cards/rfid-cards.repository';
import { AccessGroupsRepository } from './groups/access-groups.repository';
import { DriversRepository } from './profiles/drivers.repository';

/** The three tables of module 13, handed over together so the services stay small. */
@Injectable()
export class DriverStores {
  constructor(
    readonly drivers: DriversRepository,
    readonly cards: RfidCardsRepository,
    readonly groups: AccessGroupsRepository,
  ) {}
}
