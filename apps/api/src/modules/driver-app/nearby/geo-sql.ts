import { sql, SQL } from 'drizzle-orm';

/** A place on the map, in degrees. */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * Distances from a point to the site `s` of a query (module 35), by the haversine formula on
 * a sphere the size of the Earth, close enough for "0.4 km". The box comes first, so the
 * index on the coordinates narrows the rows before each distance is worked out.
 */
export class GeoSql {
  static readonly EARTH_RADIUS_M = 6_371_000;
  static readonly METRES_PER_DEGREE = 111_320;

  static metres(point: GeoPoint): SQL {
    const latitude = sql`${point.latitude}::float8`;
    const longitude = sql`${point.longitude}::float8`;
    return sql`(${GeoSql.EARTH_RADIUS_M}::float8 * 2 * asin(sqrt(
      power(sin(radians(s.latitude::float8 - ${latitude}) / 2), 2)
      + cos(radians(${latitude})) * cos(radians(s.latitude::float8))
      * power(sin(radians(s.longitude::float8 - ${longitude}) / 2), 2))))`;
  }

  static box(point: GeoPoint, radiusM: number): SQL {
    const latitudeDelta = radiusM / GeoSql.METRES_PER_DEGREE;
    const shrink = Math.max(Math.cos((point.latitude * Math.PI) / 180), 0.01);
    const longitudeDelta = radiusM / (GeoSql.METRES_PER_DEGREE * shrink);
    return sql`s.latitude between ${point.latitude - latitudeDelta} and ${point.latitude + latitudeDelta}
      and s.longitude between ${point.longitude - longitudeDelta} and ${point.longitude + longitudeDelta}`;
  }

  /** Sites inside the circle, nearest first, with their distance as `distance_m`. */
  static within(point: GeoPoint, radiusM: number): { distance: SQL; where: SQL } {
    const distance = GeoSql.metres(point);
    return { distance, where: sql`${GeoSql.box(point, radiusM)} and ${distance} <= ${radiusM}` };
  }
}
