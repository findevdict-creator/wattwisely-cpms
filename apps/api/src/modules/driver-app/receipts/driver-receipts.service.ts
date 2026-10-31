import { Injectable } from '@nestjs/common';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverChargesService } from '../charges/driver-charges.service';
import { DriverAppErrors } from '../driver-app-errors';
import { ReceiptPdf } from './receipt-pdf';

/** A driver's receipt as a PDF (module 33): only their own charge, once it has its price. */
@Injectable()
export class DriverReceiptsService {
  constructor(private readonly charges: DriverChargesService) {}

  async pdf(auth: RequestAuth, id: string): Promise<Buffer> {
    const charge = await this.charges.get(auth, id);
    if (!charge.receipt) {
      throw DriverAppErrors.receiptNotReady();
    }
    return ReceiptPdf.render(charge);
  }
}
