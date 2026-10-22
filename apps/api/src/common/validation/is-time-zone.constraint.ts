import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Accepts IANA time zone names such as "Europe/London", as Node knows them.
 * Use it on a DTO field with `@Validate(IsTimeZoneConstraint)`.
 */
@ValidatorConstraint({ name: 'isTimeZone' })
export class IsTimeZoneConstraint implements ValidatorConstraintInterface {
  private static readonly ZONES = new Set(Intl.supportedValuesOf('timeZone').concat('UTC'));

  validate(value: unknown): boolean {
    return typeof value === 'string' && IsTimeZoneConstraint.ZONES.has(value);
  }

  defaultMessage(validationArguments: ValidationArguments): string {
    return `${validationArguments.property} must be an IANA time zone such as Europe/London`;
  }
}
