import { EnvironmentProviders, Provider, inject, provideAppInitializer } from '@angular/core';
import { MAT_CARD_CONFIG, MatCardConfig } from '@angular/material/card';
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormFieldDefaultOptions,
} from '@angular/material/form-field';
import { IconRegistrar } from './icons/icon-registrar';

/** What every app provides for the shared look: outlined cards and fields, and the icons. */
export class UiProviders {
  static readonly CARD: MatCardConfig = { appearance: 'outlined' };
  static readonly FORM_FIELD: MatFormFieldDefaultOptions = { appearance: 'outline' };

  static all(): (Provider | EnvironmentProviders)[] {
    return [
      { provide: MAT_CARD_CONFIG, useValue: UiProviders.CARD },
      { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: UiProviders.FORM_FIELD },
      provideAppInitializer(() => inject(IconRegistrar).register()),
    ];
  }
}
