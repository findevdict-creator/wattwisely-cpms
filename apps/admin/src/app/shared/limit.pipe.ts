import { Pipe, PipeTransform } from '@angular/core';

/** `{{ usage.connectors | limit: usage.connector_limit }}` shows "7 / 25" or "7 / unlimited". */
@Pipe({ name: 'limit' })
export class LimitPipe implements PipeTransform {
  transform(used: number, limit: number | null | undefined): string {
    return `${used} / ${limit ?? 'unlimited'}`;
  }
}
