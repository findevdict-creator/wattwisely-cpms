import { Injectable } from '@nestjs/common';
import { sql, SQL } from 'drizzle-orm';
import { SiteAddress, StoredTariffBand, Transaction } from '@wattwisely/db';
import { ChargePlaceLookup } from '../../payments/public/charge-place.lookup';
import { PlaceAvailabilityPolicy } from '../../drivers/places/place-availability';

/** One nearby site as its tenant describes it. */
export interface NearbySiteRow extends Record<string, unknown> {
  id: string;
  tenant_id: string;
  name: string;
  address: SiteAddress;
  latitude: number;
  longitude: number;
  visibility: 'public' | 'private';
  operator_name: string;
  currency: string | null;
  bands: StoredTariffBand[] | null;
  connector_count: number;
  available_count: number;
  /** The plug a tap opens: a free one when there is one. */
  plug: { charger_identity: string; ocpp_connector_id: number } | null;
  is_member: boolean;
}

/**
 * Inside one tenant (module 35): the facts the Nearby list shows of its sites. A plug counts
 * as free as the plug page would say "available" (PlaceAvailabilityPolicy): its charger is
 * connected, it reports no fault and no car, and no session holds it.
 */
@Injectable()
export class NearbySiteDetailsRepository {
  async describe(
    tx: Transaction,
    driverAccountId: string,
    siteIds: string[],
  ): Promise<NearbySiteRow[]> {
    const result = await tx.execute<NearbySiteRow>(
      NearbySiteDetailsRepository.query(driverAccountId, siteIds),
    );
    return result.rows;
  }

  private static query(driverAccountId: string, siteIds: string[]): SQL {
    const plugs = sql`from connectors co join chargers c on c.id = co.charger_id
      where c.site_id = s.id and c.deleted_at is null`;
    const isFree = NearbySiteDetailsRepository.isFree();
    const ids = siteIds.map((id) => sql`${id}::uuid`);
    return sql`
      select s.id, s.tenant_id, s.name, s.address, s.latitude::float8 as latitude,
        s.longitude::float8 as longitude, s.visibility, tr.currency,
        coalesce(nullif(b.display_name, ''), t.name) as operator_name,
        (select v.bands from tariff_versions v where v.tariff_id = tr.id
          order by v.number desc limit 1) as bands,
        (select count(*)::int ${plugs}) as connector_count,
        (select count(*)::int ${plugs} and ${isFree}) as available_count,
        (select json_build_object('charger_identity', c.ocpp_identity,
            'ocpp_connector_id', co.ocpp_connector_id) ${plugs}
          order by ${isFree} desc, c.ocpp_identity, co.ocpp_connector_id limit 1) as plug,
        exists (select 1 from drivers d where d.driver_account_id = ${driverAccountId}
          and d.deleted_at is null and not d.is_guest and d.status = 'active') as is_member
      from sites s
      join tenants t on t.id = s.tenant_id
      left join tenant_branding b on b.tenant_id = s.tenant_id
      left join tariffs tr on tr.id = s.tariff_id and tr.status = 'active'
      where s.deleted_at is null
        and s.id in (${sql.join(ids, sql`, `)})`;
  }

  /** The plug `co` of charger `c` could start now. */
  private static isFree(): SQL {
    const quoted = (values: readonly string[]) =>
      sql.raw(values.map((value) => `'${value}'`).join(', '));
    const taken = quoted([...PlaceAvailabilityPolicy.BUSY_STATUSES, 'faulted', 'unavailable']);
    return sql`(exists (select 1 from charger_connections cc
        where cc.charger_id = c.id and cc.lease_expires_at > now())
      and co.status::text not in (${taken})
      and not exists (select 1 from charging_sessions cs where cs.connector_id = co.id
        and cs.status::text in (${quoted(ChargePlaceLookup.BUSY_STATES)})))`;
  }
}
