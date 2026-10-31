import { Site } from '../../core/api/models/site';

/** A site's pin on the map; a pin in the right half has its label to the left of its dot. */
/** A site's color: free connectors, all in use, a problem, or offline. */
export type SiteTone = 'ok' | 'busy' | 'bad' | 'off';

export interface Pin {
  site: Site;
  left: number;
  top: number;
  isFlipped: boolean;
  tone: SiteTone;
  label: string;
}

/**
 * Places the sites on a map by their coordinates, so their positions match the real ones: west
 * on the left, north at the top, all of them inside the map whatever the distances. A pin that
 * would cover one placed before it moves a row down or up.
 */
export class SiteMapLayout {
  /** Room around the pins, in percent of the map. */
  static readonly MARGIN = { left: 4, right: 4, top: 8, bottom: 14 };
  /** How close two pins may come, in percent of the map, before the later one moves. */
  static readonly ROW = 11;
  /** About how wide a label is, in percent of the map. */
  static readonly LABEL_WIDTH = 40;
  /** The chip beside a site in a list: its tone class and its word. */
  static readonly CHIPS: Record<SiteTone, { tone: string; label: string }> = {
    ok: { tone: 'ok', label: 'Available' },
    busy: { tone: 'warn', label: 'All in use' },
    bad: { tone: 'danger', label: 'Problem' },
    off: { tone: 'neutral', label: 'Offline' },
  };

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
      const left = SiteMapLayout.scale(site.longitude, box.minLng, box.maxLng, 'horizontal');
      const top = SiteMapLayout.scale(
        box.maxLat - site.latitude + box.minLat,
        box.minLat,
        box.maxLat,
        'vertical',
      );
      pins.push({
        site,
        left,
        top: SiteMapLayout.free(top, left, pins),
        isFlipped: left > 50,
        tone: SiteMapLayout.toneOf(site),
        label: SiteMapLayout.label(site),
      });
    }
    return pins;
  }

  /** "Riverside Car Park · 7 of 12 free", or what is wrong there. */
  static label(site: Site): string {
    const words: Record<SiteTone, string> = {
      ok: `${site.available_connector_count} of ${site.connector_count} free`,
      busy: 'all in use',
      bad: 'needs a look',
      off: 'offline',
    };
    return `${site.name} · ${words[SiteMapLayout.toneOf(site)]}`;
  }

  /** Green with a connector free, amber with every one in use, red with a problem, grey offline. */
  static toneOf(site: Site): SiteTone {
    if (site.status === 'offline') {
      return 'off';
    }
    if (site.status === 'problem') {
      return 'bad';
    }
    return site.connector_count > 0 && site.available_connector_count === 0 ? 'busy' : 'ok';
  }

  /** The nearest row to `top`, below first, where a pin at `left` covers none of `placed`. */
  private static free(top: number, left: number, placed: Pin[]): number {
    const [start, end] = SiteMapLayout.span(left);
    const isFree = (row: number) =>
      row >= SiteMapLayout.MARGIN.top &&
      row <= 100 - SiteMapLayout.MARGIN.bottom &&
      !placed.some((pin) => {
        const [pinStart, pinEnd] = SiteMapLayout.span(pin.left);
        return Math.abs(pin.top - row) < SiteMapLayout.ROW && start < pinEnd && pinStart < end;
      });
    const rows = [0, 1, -1, 2, -2, 3, -3, 4, -4].map((step) => top + step * SiteMapLayout.ROW);
    return rows.find(isFree) ?? top;
  }

  /** Where a pin's label runs, in percent of the map: right of the dot, or left of it. */
  private static span(left: number): [number, number] {
    return left > 50
      ? [left - SiteMapLayout.LABEL_WIDTH, left]
      : [left, left + SiteMapLayout.LABEL_WIDTH];
  }

  private static scale(
    value: number,
    min: number,
    max: number,
    axis: 'horizontal' | 'vertical',
  ): number {
    const [start, end] =
      axis === 'horizontal'
        ? [SiteMapLayout.MARGIN.left, 100 - SiteMapLayout.MARGIN.right]
        : [SiteMapLayout.MARGIN.top, 100 - SiteMapLayout.MARGIN.bottom];
    const share = max > min ? (value - min) / (max - min) : 0.5;
    return start + share * (end - start);
  }
}
