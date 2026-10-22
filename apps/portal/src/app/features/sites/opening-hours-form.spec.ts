import { OpeningHoursForm } from './opening-hours-form';

describe('OpeningHoursForm', () => {
  it('means open all hours until someone switches that off', () => {
    const form = new OpeningHoursForm();

    expect(form.toHours()).toBeNull();
    expect(form.isValid()).toBe(true);

    form.isAlwaysOpen.setValue(false);
    expect(form.toHours()).toEqual({
      mon: [{ opens: '08:00', closes: '18:00' }],
      tue: [{ opens: '08:00', closes: '18:00' }],
      wed: [{ opens: '08:00', closes: '18:00' }],
      thu: [{ opens: '08:00', closes: '18:00' }],
      fri: [{ opens: '08:00', closes: '18:00' }],
    });
  });

  it('loads a site’s hours and refuses a day that closes before it opens', () => {
    const form = OpeningHoursForm.from({ sat: [{ opens: '10:00', closes: '14:00' }] });

    expect(form.isAlwaysOpen.value).toBe(false);
    expect(form.toHours()).toEqual({ sat: [{ opens: '10:00', closes: '14:00' }] });

    form.days.sat.controls.closes.setValue('09:00');
    expect(form.isValid()).toBe(false);

    form.days.sat.controls.closes.setValue('24:00');
    expect(form.isValid()).toBe(true);

    form.days.sat.controls.closes.setValue('9pm');
    expect(form.isValid()).toBe(false);
  });
});
