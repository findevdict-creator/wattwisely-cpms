import { Pipe, PipeTransform } from '@angular/core';

/** `{{ charge.started_at | duration: charge.ended_at : now }}` shows "1 h 05 min" or "12 min". */
@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  static readonly MINUTE_MS = 60_000;

  /** `now` is passed in so the pipe runs again as the clock moves. */
  transform(from: string, to: string | null, now: number = Date.now()): string {
    const end = to ? new Date(to).getTime() : now;
    const minutes = Math.max(
      0,
      Math.floor((end - new Date(from).getTime()) / DurationPipe.MINUTE_MS),
    );
    const hours = Math.floor(minutes / 60);
    if (hours === 0) {
      return `${minutes} min`;
    }
    return `${hours} h ${String(minutes % 60).padStart(2, '0')} min`;
  }
}
