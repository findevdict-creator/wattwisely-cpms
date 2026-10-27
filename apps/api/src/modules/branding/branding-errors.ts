import { HttpStatus } from '@nestjs/common';
import { PlatformColours } from '@wattwisely/theme';
import { ProblemException } from '../../common/problem/problem.exception';
import { LogoPolicy } from './logo-policy';

/** The problems the branding endpoints answer with. */
export class BrandingErrors {
  static invalidColour(field: string): ProblemException {
    return new ProblemException(
      HttpStatus.BAD_REQUEST,
      'validation_failed',
      `${field}: use six hex digits, e.g. ${PlatformColours.PRIMARY}`,
    );
  }

  static logoTypeNotAllowed(): ProblemException {
    return new ProblemException(
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      'logo_type_not_allowed',
      `The logo must be a PNG, JPEG, SVG or WebP image.`,
    );
  }

  static logoTooLarge(): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'logo_too_large',
      `The logo must be between 1 byte and ${LogoPolicy.MAX_BYTES / 1024} KB.`,
    );
  }

  static logoNotAnImage(): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'logo_not_an_image',
      'The file is not the kind of image it says it is.',
    );
  }

  static logoUnsafe(): ProblemException {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'logo_unsafe',
      'An SVG logo may not contain scripts, event handlers or embedded documents.',
    );
  }

  static noLogo(): ProblemException {
    return new ProblemException(HttpStatus.NOT_FOUND, 'logo_not_found', 'There is no logo.');
  }
}
