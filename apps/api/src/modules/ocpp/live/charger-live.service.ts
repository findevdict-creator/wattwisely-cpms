import { Injectable, MessageEvent } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { ChargerEvent } from '@wattwisely/ocpp-contracts';
import { interval, map, merge, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { ChargersService } from '../../assets/chargers/chargers.service';
import { ChargerEventHub } from './charger-event.hub';

/**
 * One charger's live stream for the portal: connector statuses, sessions, command
 * results and connection changes as they happen (API Design, "Live events").
 */
@Injectable()
export class ChargerLiveService {
  /** A comment line this often keeps proxies from closing a quiet stream. */
  static readonly KEEP_ALIVE_MS = 25_000;

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly chargers: ChargersService,
    private readonly hub: ChargerEventHub,
  ) {}

  /** 404 like any other charger read when the charger lies outside the caller's scope. */
  async stream(access: TenantAccess, chargerId: string): Promise<Observable<MessageEvent>> {
    const charger = await this.transactionRunner.run(
      DatabaseSession.forTenant(access.tenant.id),
      (tx) => this.chargers.requireVisible(tx, access, chargerId),
    );
    const events = this.hub.events.pipe(
      filter((event) => event.tenant_id === access.tenant.id && event.charger_id === charger.id),
      map((event) => ChargerLiveService.toMessage(event)),
    );
    const keepAlive = interval(ChargerLiveService.KEEP_ALIVE_MS).pipe(
      map(() => ({ type: 'keep-alive', data: '' })),
    );
    return merge(events, keepAlive);
  }

  private static toMessage(event: ChargerEvent): MessageEvent {
    return { type: event.type, data: event };
  }
}
