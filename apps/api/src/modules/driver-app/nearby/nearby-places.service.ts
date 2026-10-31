import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { RequestAuth } from '../../../common/request/request-auth';
import { NearbyPlaceDto } from './dto/nearby-place.dto';
import { NearbyPlacesDto } from './dto/nearby-places.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { NearbySiteDetailsRepository } from './nearby-site-details.repository';
import { NearbyArea, NearbySitesRepository, SiteHit } from './nearby-sites.repository';

/**
 * The charging sites near the driver's phone (module 35), at every operator: the public
 * ones, and the private ones the driver is a member at. Each tenant's details are read in
 * that tenant, so the search itself sees no more of a tenant than where its public sites are.
 */
@Injectable()
export class NearbyPlacesService {
  static readonly DEFAULT_RADIUS_KM = 15;
  static readonly LIMIT = 20;

  constructor(
    private readonly runner: TransactionRunner,
    private readonly sites: NearbySitesRepository,
    private readonly details: NearbySiteDetailsRepository,
  ) {}

  async near(auth: RequestAuth, query: NearbyQueryDto): Promise<NearbyPlacesDto> {
    const account = auth.requireDriver();
    const area: NearbyArea = {
      point: { latitude: query.latitude, longitude: query.longitude },
      radiusM: (query.radius_km ?? NearbyPlacesService.DEFAULT_RADIUS_KM) * 1000,
      limit: NearbyPlacesService.LIMIT,
    };
    const hits = await this.hits(account.id, area);
    const places: NearbyPlaceDto[] = [];
    for (const [tenantId, tenantHits] of NearbyPlacesService.byTenant(hits)) {
      places.push(...(await this.describe(account.id, tenantId, tenantHits)));
    }
    const nearest = places.sort((a, b) => a.distance_m - b.distance_m);
    return new NearbyPlacesDto(nearest.slice(0, NearbyPlacesService.LIMIT));
  }

  /** The public sites in the circle, then the private ones in each tenant that knows the driver. */
  private async hits(accountId: string, area: NearbyArea): Promise<SiteHit[]> {
    const hits = await this.runner.run(DatabaseSession.forSiteSearch(), (tx) =>
      this.sites.publicNear(tx, area),
    );
    const tenants = await this.runner.run(DatabaseSession.forDriverAccount(accountId), (tx) =>
      this.sites.linkedTenants(tx, accountId),
    );
    for (const tenantId of tenants) {
      hits.push(
        ...(await this.runner.run(DatabaseSession.forTenant(tenantId), (tx) =>
          this.sites.privateNear(tx, accountId, area),
        )),
      );
    }
    return hits;
  }

  private async describe(accountId: string, tenantId: string, hits: SiteHit[]) {
    const distances = new Map(hits.map((hit) => [hit.siteId, hit.distanceM]));
    const rows = await this.runner.run(DatabaseSession.forTenant(tenantId), (tx) =>
      this.details.describe(tx, accountId, [...distances.keys()]),
    );
    return rows.map((row) => new NearbyPlaceDto(row, distances.get(row.id) ?? 0));
  }

  private static byTenant(hits: SiteHit[]): Map<string, SiteHit[]> {
    const groups = new Map<string, SiteHit[]>();
    for (const hit of hits) {
      groups.set(hit.tenantId, [...(groups.get(hit.tenantId) ?? []), hit]);
    }
    return groups;
  }
}
