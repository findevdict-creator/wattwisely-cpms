import { Injectable } from '@nestjs/common';
import { OcppVersion } from '@wattwisely/ocpp-contracts';
import { OcppAdapter } from './ocpp-adapter';
import { V16Adapter } from './v16/v16-adapter';
import { V201Adapter } from './v201/v201-adapter';

/** The adapter for each OCPP version a connection may speak; the connection's version picks it. */
@Injectable()
export class AdapterRegistry {
  private readonly adapters: Record<OcppVersion, OcppAdapter>;

  constructor(v16: V16Adapter, v201: V201Adapter) {
    this.adapters = { '1.6': v16, '2.0.1': v201 };
  }

  for(version: OcppVersion): OcppAdapter {
    return this.adapters[version];
  }
}
