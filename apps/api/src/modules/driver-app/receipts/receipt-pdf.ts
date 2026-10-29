import PDFDocument from 'pdfkit';
import { DriverChargeDetailDto } from '../charges/dto/driver-charge-detail.dto';
import { ReceiptText } from './receipt-text';

/** A label and its amount, one line of the receipt. */
interface ReceiptRow {
  label: string;
  value: string;
}

/**
 * The receipt as an A4 PDF (module 33, story SES-03), in the operator's name: where and when,
 * the energy, each priced line, the tax and the total, then what was taken from the card.
 * PDFKit's built-in Helvetica covers the euro and pound signs, so no font is shipped.
 */
export class ReceiptPdf {
  static readonly MARGIN = 56;
  static readonly WIDTH = 595.28 - 2 * ReceiptPdf.MARGIN;

  static render(charge: DriverChargeDetailDto): Promise<Buffer> {
    const document = new PDFDocument({
      size: 'A4',
      margin: ReceiptPdf.MARGIN,
      info: ReceiptPdf.info(charge),
    });
    const chunks: Buffer[] = [];
    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) =>
      document.on('end', () => resolve(Buffer.concat(chunks))),
    );
    ReceiptPdf.heading(document, charge);
    ReceiptPdf.rows(document, ReceiptPdf.lines(charge));
    ReceiptPdf.rows(document, ReceiptPdf.payment(charge));
    document.moveDown(2).font('Helvetica').fontSize(9).fillColor('#64748b');
    document.text(
      `Charge reference ${charge.id}. Issued by ${charge.operator_name} through Wattwisely.`,
    );
    document.end();
    return done;
  }

  private static heading(document: PDFKit.PDFDocument, charge: DriverChargeDetailDto): void {
    document.font('Helvetica-Bold').fontSize(20).fillColor('#0f172a').text(charge.operator_name);
    document.moveDown(0.3).font('Helvetica').fontSize(12).text('Receipt for a charge');
    document.moveDown(1).fontSize(10).fillColor('#475569');
    document.text(`${charge.site_name} · Connector ${charge.connector_label}`);
    document.text(ReceiptText.period(charge));
    document.text(`${(charge.energy_wh / 1000).toFixed(1)} kWh delivered`);
    document.moveDown(1);
  }

  /** Each priced line, the tax and the total. */
  private static lines(charge: DriverChargeDetailDto): ReceiptRow[] {
    const currency = charge.currency ?? 'EUR';
    const receipt = charge.receipt;
    const rows = (receipt?.lines ?? []).map((line) => ({
      label: ReceiptText.line(line, currency),
      value: ReceiptText.money(line.gross, currency),
    }));
    return [
      ...rows,
      { label: 'Tax included', value: ReceiptText.money(receipt?.tax ?? 0, currency) },
      { label: 'Total', value: ReceiptText.money(receipt?.gross ?? charge.amount, currency) },
    ];
  }

  /** What became of the hold, or that the charge was free. */
  private static payment(charge: DriverChargeDetailDto): ReceiptRow[] {
    const currency = charge.currency ?? 'EUR';
    const payment = charge.payment;
    if (!charge.is_paid || !payment) {
      return [{ label: charge.payment_rule?.words ?? 'Free of charge', value: '' }];
    }
    if (payment.status === 'released') {
      return [{ label: `Nothing was taken from ${ReceiptText.card(charge)}`, value: '' }];
    }
    return [
      {
        label: `Paid with ${ReceiptText.card(charge)}`,
        value: ReceiptText.money(charge.amount, currency),
      },
    ];
  }

  private static rows(document: PDFKit.PDFDocument, rows: ReceiptRow[]): void {
    for (const [index, row] of rows.entries()) {
      const isLast = index === rows.length - 1;
      const y = document.y;
      document
        .font(isLast ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(11)
        .fillColor('#0f172a');
      document.text(row.label, ReceiptPdf.MARGIN, y, { width: ReceiptPdf.WIDTH * 0.7 });
      document.text(row.value, ReceiptPdf.MARGIN, y, { width: ReceiptPdf.WIDTH, align: 'right' });
      document.moveDown(0.4);
    }
    document.moveDown(1);
  }

  private static info(charge: DriverChargeDetailDto): PDFKit.DocumentInfo {
    return { Title: `Receipt from ${charge.operator_name}`, Author: charge.operator_name };
  }
}
