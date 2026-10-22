import { Segment } from './local-time-segmenter';

/** Joins neighbouring segments in the same band (a band that runs past midnight is one line). */
export class SegmentMerger {
  static mergeAdjacent(segments: Segment[]): Segment[] {
    const merged: Segment[] = [];
    for (const segment of segments) {
      const last = merged[merged.length - 1];
      if (last && last.band === segment.band && last.to.getTime() === segment.from.getTime()) {
        last.to = segment.to;
      } else {
        merged.push({ ...segment });
      }
    }
    return merged;
  }
}
