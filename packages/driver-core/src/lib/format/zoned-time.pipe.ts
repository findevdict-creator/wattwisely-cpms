import { Pipe, PipeTransform } from '@angular/core';

/**
 * `{{ line.from | zonedTime: session.time_zone }}` shows "17:00" as the clock read at the
 * site, which is what band times mean. Without a zone it uses the browser's.
 */
@Pipe({ name: 'zonedTime' })
export class ZonedTimePipe implements PipeTransform {
  transform(value: string | null | undefined, timeZone?: string, withDate = false): string {
    if (!value) {
      return '';
    }
    const format = new Intl.DateTimeFormat(undefined, {
      ...(withDate ? { dateStyle: 'medium' } : {}),
      timeStyle: 'short',
      hourCycle: 'h23',
      timeZone,
    });
    return format.format(new Date(value));
  }
}
