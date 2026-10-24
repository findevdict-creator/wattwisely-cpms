import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, lt, ne, SQL, sql } from 'drizzle-orm';
import { invoiceLines, invoices, tenants, Transaction, UuidV7 } from '@wattwisely/db';
import { ListCursor } from '../../common/paging/list-cursor';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import { InvoiceLineRow, InvoiceRecord, InvoiceRow, InvoiceWithLines } from './invoice-record';

/** The columns a change may set; the status machine lives in InvoiceWriter. */
export type InvoiceChanges = Partial<
  Omit<InvoiceRow, 'id' | 'tenantId' | 'version' | 'createdAt' | 'updatedAt'>
>;

/**
 * Reads and writes invoices. A tenant's own transaction sees its issued, paid and void
 * invoices (row-level security hides drafts); the admin console and the worker see all.
 */
@Injectable()
export class InvoicesRepository {
  /** Newest month first; the cursor carries the month and id of the last row. */
  async findPage(
    tx: Transaction,
    query: ListInvoicesQueryDto,
    cursor: ListCursor | null,
    limit: number,
  ): Promise<InvoiceRecord[]> {
    return this.select(tx)
      .where(and(...InvoicesRepository.conditions(query, cursor)))
      .orderBy(desc(invoices.periodStart), desc(invoices.id))
      .limit(limit);
  }

  /** The invoices of the current tenant, newest month first (its own view, so drafts are hidden). */
  findForTenant(tx: Transaction, tenantId: string): Promise<InvoiceRecord[]> {
    return this.select(tx)
      .where(eq(invoices.tenantId, tenantId))
      .orderBy(desc(invoices.periodStart), desc(invoices.id))
      .limit(120);
  }

  async findById(tx: Transaction, id: string): Promise<InvoiceWithLines | null> {
    if (!UuidV7.isUuid(id)) {
      return null;
    }
    const rows = await this.select(tx).where(eq(invoices.id, id));
    if (!rows[0]) {
      return null;
    }
    return { ...rows[0], lines: await this.findLines(tx, id) };
  }

  findLines(tx: Transaction, invoiceId: string): Promise<InvoiceLineRow[]> {
    return tx
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, invoiceId))
      .orderBy(asc(invoiceLines.position));
  }

  /** A live (not void) invoice of the tenant for the month, if there is one. */
  async findForMonth(tx: Transaction, tenantId: string, firstDay: string) {
    const rows = await tx
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.periodStart, firstDay),
          ne(invoices.status, 'void'),
        ),
      );
    return rows[0] ?? null;
  }

  /** Applies the change only when the row still has the version the caller saw. True when it did. */
  async update(
    tx: Transaction,
    id: string,
    version: number,
    changes: InvoiceChanges,
  ): Promise<boolean> {
    const rows = await tx
      .update(invoices)
      .set({ ...changes, version: version + 1, updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.version, version)))
      .returning({ id: invoices.id });
    return rows.length === 1;
  }

  async insertLine(
    tx: Transaction,
    invoice: Pick<InvoiceRow, 'id' | 'tenantId'>,
    line: { position: number; description: string; amount: number },
  ): Promise<string> {
    const id = UuidV7.create();
    await tx.insert(invoiceLines).values({
      id,
      tenantId: invoice.tenantId,
      invoiceId: invoice.id,
      position: line.position,
      kind: 'adjustment',
      description: line.description,
      quantity: 1,
      unitPrice: null,
      amount: line.amount,
      details: {},
    });
    return id;
  }

  /** True when the line belonged to the invoice and is gone. */
  async deleteLine(tx: Transaction, invoiceId: string, lineId: string): Promise<boolean> {
    if (!UuidV7.isUuid(lineId)) {
      return false;
    }
    const rows = await tx
      .delete(invoiceLines)
      .where(and(eq(invoiceLines.invoiceId, invoiceId), eq(invoiceLines.id, lineId)))
      .returning({ id: invoiceLines.id });
    return rows.length === 1;
  }

  /** The next number of the year, without gaps: the year's row is locked while it is taken. */
  async nextNumber(tx: Transaction, year: number): Promise<number> {
    const result = await tx.execute<{ last_number: number }>(sql`
      insert into invoice_sequences (year, last_number) values (${year}, 1)
      on conflict (year) do update set last_number = invoice_sequences.last_number + 1
      returning last_number`);
    return Number(result.rows[0].last_number);
  }

  private select(tx: Transaction) {
    return tx
      .select({ invoice: invoices, tenant: { slug: tenants.slug, name: tenants.name } })
      .from(invoices)
      .innerJoin(tenants, eq(tenants.id, invoices.tenantId))
      .$dynamic();
  }

  private static conditions(
    query: ListInvoicesQueryDto,
    cursor: ListCursor | null,
  ): (SQL | undefined)[] {
    const isOverdue = query.status === 'overdue';
    return [
      query.tenant_id ? eq(invoices.tenantId, query.tenant_id) : undefined,
      query.month ? eq(invoices.periodStart, `${query.month}-01`) : undefined,
      query.status && !isOverdue ? eq(invoices.status, query.status) : undefined,
      isOverdue ? and(eq(invoices.status, 'issued'), lt(invoices.dueAt, new Date())) : undefined,
      cursor
        ? sql`(${invoices.periodStart}::text, ${invoices.id}) < (${cursor.key}, ${cursor.id}::uuid)`
        : undefined,
    ];
  }
}
