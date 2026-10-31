import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { Transaction } from '@wattwisely/db';
import { GeoPoint, GeoSql } from './geo-sql';

/** A site inside the circle, before its details are read in its tenant. */
export interface SiteHit {
  siteId: string;
  tenantId: string;
  distanceM: number;
}

/** The circle to search, and how many sites to keep. */
export interface NearbyArea {
  point: GeoPoint;
  radiusM: number;
  limit: number;
}

/**
 * Finds the sites near the driver (module 35): every operator's public sites, through the
 * site search's own policy, and the private sites the driver is a member at, in each tenant
 * that keeps a record of them.
 */
@Injectable()
export class NearbySitesRepository {
  /** Run under DatabaseSession.forSiteSearch: only public sites of tenants that trade are seen. */
  async publicNear(tx: Transaction, area: NearbyArea): Promise<SiteHit[]> {
    const { distance, where } = GeoSql.within(area.point, area.radiusM);
    const result = await tx.execute<{ site_id: string; tenant_id: string; distance_m: number }>(sql`
      select s.id as site_id, s.tenant_id, ${distance} as distance_m
      from sites s join tenants t on t.id = s.tenant_id and t.status in ('trial', 'active')
      where ${where}
      order by distance_m limit ${area.limit}`);
    return result.rows.map(NearbySitesRepository.hit);
  }

  /** Run under DatabaseSession.forDriverAccount: the tenants where the login is an active driver. */
  async linkedTenants(tx: Transaction, driverAccountId: string): Promise<string[]> {
    const result = await tx.execute<{ tenant_id: string }>(sql`
      select distinct tenant_id from drivers
      where driver_account_id = ${driverAccountId} and deleted_at is null and status = 'active'`);
    return result.rows.map((row) => row.tenant_id);
  }

  /** Run in the tenant: its private sites where one of the driver's access groups lets them charge. */
  async privateNear(
    tx: Transaction,
    driverAccountId: string,
    area: NearbyArea,
  ): Promise<SiteHit[]> {
    const { distance, where } = GeoSql.within(area.point, area.radiusM);
    const result = await tx.execute<{ site_id: string; tenant_id: string; distance_m: number }>(sql`
      select s.id as site_id, s.tenant_id, ${distance} as distance_m
      from sites s
      where s.deleted_at is null and s.visibility = 'private' and ${where}
        and exists (select 1 from drivers d
          join access_group_members m on m.driver_id = d.id
          join access_group_sites g on g.group_id = m.group_id
          where d.driver_account_id = ${driverAccountId} and d.deleted_at is null
            and d.status = 'active' and g.site_id = s.id)
      order by distance_m limit ${area.limit}`);
    return result.rows.map(NearbySitesRepository.hit);
  }

  private static hit(row: { site_id: string; tenant_id: string; distance_m: number }): SiteHit {
    return { siteId: row.site_id, tenantId: row.tenant_id, distanceM: Number(row.distance_m) };
  }
}
