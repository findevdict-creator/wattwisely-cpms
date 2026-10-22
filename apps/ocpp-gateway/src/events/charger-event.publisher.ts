import { Injectable } from '@nestjs/common';
import { ChargerEventNotifier } from '@wattwisely/session-engine';

/**
 * Announces what happened on a charger over Postgres NOTIFY, inside the transaction
 * that recorded it (the notifier is shared with the worker, which announces prices).
 */
@Injectable()
export class ChargerEventPublisher extends ChargerEventNotifier {}
