import { Injectable, inject } from '@angular/core';
import { ApiProblem, DriverCharge, DriverChargesApiService } from '@wattwisely/driver-core';
import { firstValueFrom } from 'rxjs';
import { NativeFiles } from '../native/native-files';

/**
 * A charge's receipt as a PDF (module 33), fetched with the login and opened in the phone's
 * PDF viewer, from the session's page and from "Charging complete".
 */
@Injectable({ providedIn: 'root' })
export class ReceiptFiles {
  static readonly NOT_READY = 'The receipt is ready once the charge has been priced.';

  private readonly api = inject(DriverChargesApiService);
  private readonly files = inject(NativeFiles);

  /** '' once the receipt opened, or why it could not. */
  async open(charge: DriverCharge): Promise<string> {
    try {
      const pdf = await firstValueFrom(this.api.receiptPdf(charge.id));
      await this.files.open(pdf, ReceiptFiles.fileName(charge));
      return '';
    } catch (error) {
      const problem = ApiProblem.from(error);
      return problem.status === 409 ? ReceiptFiles.NOT_READY : problem.detail;
    }
  }

  /** "receipt-2026-10-21-riverside-car-park.pdf". */
  static fileName(charge: DriverCharge): string {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: charge.time_zone }).format(
      new Date(charge.started_at),
    );
    const site = charge.site_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `receipt-${day}${site ? `-${site}` : ''}.pdf`;
  }
}
