import { Injectable } from '@nestjs/common';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverLinkWriter } from '../driver-link.writer';
import { DriverOperatorListDto } from './dto/driver-operator-list.dto';
import { DriverOperatorProfileDto } from './dto/driver-operator-profile.dto';
import { DriverOperatorDto } from './dto/driver-operator.dto';
import { OperatorLinkTransaction } from './operator-link.transaction';
import { OperatorProfileReader } from './operator-profile.reader';

/**
 * "My operators" in the driver app (module 19, story DRV-05): the operators whose driver
 * record is linked to this login, what each one holds about the driver, and leaving one.
 */
@Injectable()
export class DriverOperatorsService {
  constructor(
    private readonly transaction: OperatorLinkTransaction,
    private readonly profiles: OperatorProfileReader,
    private readonly links: DriverLinkWriter,
  ) {}

  async list(auth: RequestAuth): Promise<DriverOperatorListDto> {
    const records = await this.transaction.listAll(auth);
    return new DriverOperatorListDto(records.map((record) => new DriverOperatorDto(record)));
  }

  /** The consent screen: everything the operator sees about the driver. */
  profile(auth: RequestAuth, tenantId: string): Promise<DriverOperatorProfileDto> {
    return this.transaction.run(
      auth,
      tenantId,
      async (tx, link) => new DriverOperatorProfileDto(await this.profiles.read(tx, link)),
    );
  }

  /** The driver leaves the operator: the record stays with the operator, without the login. */
  async leave(auth: RequestAuth, tenantId: string): Promise<void> {
    await this.transaction.run(auth, tenantId, (tx, link) =>
      this.links.apply(tx, auth, { ...link, action: 'unlinked', accountId: null }),
    );
  }
}
