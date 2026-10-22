import { Component, input } from '@angular/core';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { TariffBandControls, TariffBandForm } from './tariff-band-form';

/**
 * The bands of a tariff as a table: name, days, local times and the three unit prices.
 * Together the bands must cover every hour of the week once; the API says where not.
 */
@Component({
  selector: 'ww-tariff-bands',
  imports: [MatButtonModule, MatIconModule, MatSelectModule, ReactiveFormsModule],
  templateUrl: './tariff-bands.component.html',
  styleUrl: './tariff-bands.component.scss',
})
export class TariffBandsComponent {
  readonly bands = input.required<FormArray<TariffBandControls>>();
  readonly currency = input.required<string>();
  readonly isEditable = input(true);

  protected readonly weekdays = TariffBandForm.WEEKDAYS;

  protected add(): void {
    this.bands().push(
      TariffBandForm.create({ ...TariffBandForm.ALL_DAY, name: '', start: '', end: '' }),
    );
  }

  protected remove(index: number): void {
    this.bands().removeAt(index);
  }
}
