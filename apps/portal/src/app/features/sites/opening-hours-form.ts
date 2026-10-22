import { FormControl, FormGroup, Validators } from '@angular/forms';
import { OpeningHours, Weekday } from '../../core/api/models/site';

/** One weekday's row in the opening hours editor. */
export type DayForm = FormGroup<{
  isOpen: FormControl<boolean>;
  opens: FormControl<string>;
  closes: FormControl<string>;
}>;

/**
 * The opening hours part of the site form: one period per weekday, or open all hours.
 * The API allows several periods a day; the editor keeps it to one, which covers most sites.
 */
export class OpeningHoursForm {
  static readonly WEEKDAYS: { key: Weekday; label: string }[] = [
    { key: 'mon', label: 'Monday' },
    { key: 'tue', label: 'Tuesday' },
    { key: 'wed', label: 'Wednesday' },
    { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' },
    { key: 'sat', label: 'Saturday' },
    { key: 'sun', label: 'Sunday' },
  ];
  static readonly TIME = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;

  readonly isAlwaysOpen = new FormControl(true, { nonNullable: true });
  readonly days: Record<Weekday, DayForm> = OpeningHoursForm.emptyDays();

  static from(hours: OpeningHours | null): OpeningHoursForm {
    const form = new OpeningHoursForm();
    if (!hours) {
      return form;
    }
    form.isAlwaysOpen.setValue(false);
    for (const { key } of OpeningHoursForm.WEEKDAYS) {
      const period = hours[key]?.[0];
      form.days[key].setValue({
        isOpen: Boolean(period),
        opens: period?.opens ?? '08:00',
        closes: period?.closes ?? '18:00',
      });
    }
    return form;
  }

  /** null for open all hours; otherwise the days that are open. */
  toHours(): OpeningHours | null {
    if (this.isAlwaysOpen.value) {
      return null;
    }
    const hours: OpeningHours = {};
    for (const { key } of OpeningHoursForm.WEEKDAYS) {
      const day = this.days[key].getRawValue();
      if (day.isOpen) {
        hours[key] = [{ opens: day.opens, closes: day.closes }];
      }
    }
    return hours;
  }

  isValid(): boolean {
    if (this.isAlwaysOpen.value) {
      return true;
    }
    return OpeningHoursForm.WEEKDAYS.every(({ key }) => {
      const day = this.days[key].getRawValue();
      return !day.isOpen || (this.days[key].valid && day.opens < day.closes);
    });
  }

  private static emptyDays(): Record<Weekday, DayForm> {
    const days = {} as Record<Weekday, DayForm>;
    for (const { key } of OpeningHoursForm.WEEKDAYS) {
      days[key] = new FormGroup({
        isOpen: new FormControl(key !== 'sat' && key !== 'sun', { nonNullable: true }),
        opens: new FormControl('08:00', {
          nonNullable: true,
          validators: [Validators.pattern(OpeningHoursForm.TIME)],
        }),
        closes: new FormControl('18:00', {
          nonNullable: true,
          validators: [Validators.pattern(OpeningHoursForm.TIME)],
        }),
      });
    }
    return days;
  }
}
