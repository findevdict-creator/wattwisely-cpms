import { eq } from 'drizzle-orm';
import { sessionLineItems, Transaction, UuidV7 } from '@wattwisely/db';
import { LineItem } from '@wattwisely/pricing';

/** Writes a session's receipt lines; pricing again replaces them. */
export class SessionLineStore {
  async replace(
    tx: Transaction,
    session: { id: string; tenantId: string },
    lines: LineItem[],
  ): Promise<void> {
    await tx.delete(sessionLineItems).where(eq(sessionLineItems.sessionId, session.id));
    if (lines.length === 0) {
      return;
    }
    await tx.insert(sessionLineItems).values(
      lines.map((line, index) => ({
        id: UuidV7.create(),
        tenantId: session.tenantId,
        sessionId: session.id,
        position: index + 1,
        kind: line.kind,
        bandName: line.bandName,
        fromAt: line.from,
        toAt: line.to,
        quantity: line.quantity,
        unit: line.unit,
        unitPrice: line.unitPrice,
        net: line.net,
        tax: line.tax,
        gross: line.gross,
      })),
    );
  }
}
