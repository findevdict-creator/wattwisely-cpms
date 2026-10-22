import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, SQL, sql } from 'drizzle-orm';
import { ocppMessages, Transaction } from '@wattwisely/db';
import { ListCursor } from '../../../common/paging/list-cursor';
import { OcppMessageRecord } from './ocpp-message-record';

/** How a charger's message log is narrowed. */
export interface MessageFilter {
  chargerId: string;
  direction?: 'in' | 'out';
  actions?: string[];
  isErrorsOnly?: boolean;
}

/** Reads the raw OCPP message log the gateway writes. RLS limits every query to the current tenant. */
@Injectable()
export class OcppMessagesRepository {
  static readonly COLUMNS = {
    id: ocppMessages.id,
    chargerId: ocppMessages.chargerId,
    direction: ocppMessages.direction,
    messageType: ocppMessages.messageType,
    messageId: ocppMessages.messageId,
    action: ocppMessages.action,
    payload: ocppMessages.payload,
    errorCode: ocppMessages.errorCode,
    receivedAt: ocppMessages.receivedAt,
  };

  /** Newest first; the cursor is the received_at and id of the last row seen. */
  async findPage(
    tx: Transaction,
    filter: MessageFilter,
    cursor: ListCursor | null,
    limit: number,
  ): Promise<OcppMessageRecord[]> {
    return tx
      .select(OcppMessagesRepository.COLUMNS)
      .from(ocppMessages)
      .where(and(...OcppMessagesRepository.conditions(filter, cursor)))
      .orderBy(desc(ocppMessages.receivedAt), desc(ocppMessages.id))
      .limit(limit);
  }

  private static conditions(filter: MessageFilter, cursor: ListCursor | null): (SQL | undefined)[] {
    return [
      eq(ocppMessages.chargerId, filter.chargerId),
      filter.direction ? eq(ocppMessages.direction, filter.direction) : undefined,
      filter.actions ? inArray(ocppMessages.action, filter.actions) : undefined,
      filter.isErrorsOnly ? eq(ocppMessages.messageType, 'call_error') : undefined,
      cursor
        ? sql`(${ocppMessages.receivedAt}, ${ocppMessages.id}) < (${cursor.key}::timestamptz, ${cursor.id}::uuid)`
        : undefined,
    ];
  }
}
