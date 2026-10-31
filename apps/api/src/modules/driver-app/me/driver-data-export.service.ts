import { Injectable } from '@nestjs/common';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverChargesService } from '../charges/driver-charges.service';
import { DriverOperatorsService } from '../operators/driver-operators.service';
import { DriverPaymentMethodsService } from '../payment-methods/payment-methods.service';
import { DriverDataExportDto } from './dto/driver-data-export.dto';
import { DriverMeDto } from './dto/driver-me.dto';

/**
 * Everything Wattwisely and the driver's operators hold about them (module 33, "Download my
 * data"): the account, what each linked operator keeps, the saved cards as the app shows them,
 * and the charges. Built from the app's own answers, so it never shows more than they do.
 */
@Injectable()
export class DriverDataExportService {
  constructor(
    private readonly operators: DriverOperatorsService,
    private readonly cards: DriverPaymentMethodsService,
    private readonly charges: DriverChargesService,
  ) {}

  async export(auth: RequestAuth): Promise<DriverDataExportDto> {
    const operators = await this.operators.list(auth);
    const profiles = [];
    for (const operator of operators.items) {
      profiles.push(await this.operators.profile(auth, operator.tenant_id));
    }
    return new DriverDataExportDto({
      account: new DriverMeDto(auth.requireDriver()),
      operators: profiles,
      cards: (await this.cards.list(auth)).items,
      charges: (await this.charges.list(auth)).items,
    });
  }
}
