import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Weekday } from '../../core/api/models/site';
import { TariffBand } from '../../core/api/models/tariff';

/** The controls of one band row. */
export type TariffBandControls = FormGroup<{
  name: FormControl<string>;
  days: FormControl<Weekday[]>;
  start: FormControl<string>;
  end: FormControl<string>;
  energyPrice: FormControl<string>;
  timePrice: FormControl<string>;
  idleFee: FormControl<string>;
}>;

/** One band row of the tariff editor, and how it turns into the API's band. */
export class TariffBandForm {
  static readonly WEEKDAYS: { key: Weekday; label: string }[] = [
    { key: 'mon', label: 'Mon' },
    { key: 'tue', label: 'Tue' },
    { key: 'wed', label: 'Wed' },
    { key: 'thu', label: 'Thu' },
    { key: 'fri', label: 'Fri' },
    { key: 'sat', label: 'Sat' },
    { key: 'sun', label: 'Sun' },
  ];
  static readonly TIME = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;
  static readonly PRICE = /^\d{1,4}(\.\d{1,4})?$/;
  static readonly ALL_DAY: TariffBand = {
    name: 'All day',
    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    start: '00:00',
    end: '24:00',
    energy_price_per_kwh: '0.30',
    time_price_per_hour: '0',
    idle_fee_per_minute: '0',
  };

  /** "every day", "Mon–Fri", or "Sat, Sun" */
  static daysText(days: Weekday[]): string {
    const indexes = TariffBandForm.WEEKDAYS.map((day, index) =>
      days.includes(day.key) ? index : -1,
    ).filter((index) => index >= 0);
    if (indexes.length === 7) {
      return 'every day';
    }
    const label = (index: number) => TariffBandForm.WEEKDAYS[index].label;
    const first = indexes[0] ?? 0;
    const isRun = indexes.length > 2 && indexes[indexes.length - 1] === first + indexes.length - 1;
    return isRun
      ? `${label(first)}–${label(indexes[indexes.length - 1])}`
      : indexes.map(label).join(', ');
  }

  static create(band: TariffBand = TariffBandForm.ALL_DAY): TariffBandControls {
    const price = (value: string) =>
      new FormControl(value, {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(TariffBandForm.PRICE)],
      });
    const time = (value: string) =>
      new FormControl(value, {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(TariffBandForm.TIME)],
      });
    return new FormGroup({
      name: new FormControl(band.name, {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(40)],
      }),
      days: new FormControl<Weekday[]>(band.days, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      start: time(band.start),
      end: time(band.end),
      energyPrice: price(TariffBandForm.trim(band.energy_price_per_kwh)),
      timePrice: price(TariffBandForm.trim(band.time_price_per_hour)),
      idleFee: price(TariffBandForm.trim(band.idle_fee_per_minute)),
    });
  }

  static toBand(group: TariffBandControls): TariffBand {
    const value = group.getRawValue();
    return {
      name: value.name.trim(),
      days: TariffBandForm.WEEKDAYS.map((day) => day.key).filter((key) => value.days.includes(key)),
      start: value.start,
      end: value.end,
      energy_price_per_kwh: value.energyPrice,
      time_price_per_hour: value.timePrice,
      idle_fee_per_minute: value.idleFee,
    };
  }

  /** "0.3000" as "0.30": the API keeps four decimals, people read two. */
  static trim(price: string): string {
    return price.includes('.') ? price.replace(/(\.\d\d\d*?)0+$/, '$1') : price;
  }
}
