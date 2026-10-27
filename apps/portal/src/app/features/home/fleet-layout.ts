import { Site } from '../../core/api/models/site';

/** A site's pin on the fleet card; a pin in the right half has its label to the left of its dot. */
export interface Pin {
  site: Site;
  left: number;
  top: number;
  isFlipped: boolean;
  tone: 'ok' | 'bad' | 'off';
  label: string;
}

/**
 * Places the sites on the fleet card by their coordinates, so their positions match the map:
 * west on the left, north at the top, all of them inside the card whatever the distances. A
 * pin that would cover one placed before it moves down a row.
 */
export class FleetLayout {
  /** Room around the pins, in percent of the card. */
  static readonly MARGIN = { left: 4, right: 4, top: 8, bottom: 14 };
  /** How close two pins may come, in percent of the card, before the later one moves. */
  static readonly ROW = 11;
  /** About how wide a label is, in percent of the card. */
  static readonly LABEL_WIDTH = 40;

  static place(sites: Site[]): Pin[] {
    const lats = sites.map((site) => site.latitude);
    const lngs = sites.map((site) => site.longitude);
    const box = {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
    const pins: Pin[] = [];
    for (const site of sites) {
      const left = FleetLayout.scale(site.longitude, box.minLng, box.maxLng, 'horizontal');
      const top = FleetLayout.scale(
        box.maxLat - site.latitude + box.minLat,
        box.minLat,
        box.maxLat,
        'vertical',
      );
      pins.push({
        site,
        left,
        top: FleetLayout.free(top, left, pins),
        isFlipped: left > 50,
        tone: site.status === 'ok' ? 'ok' : site.status === 'problem' ? 'bad' : 'off',
        label: FleetLayout.label(site),
      });
    }
    return pins;
  }

  /** "Riverside Car Park · 7 of 12 free", or what is wrong there. */
  static label(site: Site): string {
    if (site.status === 'offline') {
      return `${site.name} · offline`;
    }
    if (site.status === 'problem') {
      return `${site.name} · needs a look`;
    }
    return `${site.name} · ${site.available_connector_count} of ${site.connector_count} free`;
  }

  /** The nearest row to `top`, below first, where a pin at `left` covers none of `placed`. */
  private static free(top: number, left: number, placed: Pin[]): number {
    const [start, end] = FleetLayout.span(left);
    const isFree = (row: number) =>
      row >= FleetLayout.MARGIN.top &&
      row <= 100 - FleetLayout.MARGIN.bottom &&
      !placed.some((pin) => {
        const [pinStart, pinEnd] = FleetLayout.span(pin.left);
        return Math.abs(pin.top - row) < FleetLayout.ROW && start < pinEnd && pinStart < end;
      });
    const rows = [0, 1, -1, 2, -2, 3, -3, 4, -4].map((step) => top + step * FleetLayout.ROW);
    return rows.find(isFree) ?? top;
  }

  /** Where a pin's label runs, in percent of the card: right of the dot, or left of it. */
  private static span(left: number): [number, number] {
    return left > 50
      ? [left - FleetLayout.LABEL_WIDTH, left]
      : [left, left + FleetLayout.LABEL_WIDTH];
  }

  private static scale(
    value: number,
    min: number,
    max: number,
    axis: 'horizontal' | 'vertical',
  ): number {
    const [start, end] =
      axis === 'horizontal'
        ? [FleetLayout.MARGIN.left, 100 - FleetLayout.MARGIN.right]
        : [FleetLayout.MARGIN.top, 100 - FleetLayout.MARGIN.bottom];
    const share = max > min ? (value - min) / (max - min) : 0.5;
    return start + share * (end - start);
  }
}
