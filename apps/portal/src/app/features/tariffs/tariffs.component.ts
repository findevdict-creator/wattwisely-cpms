import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Tariff } from '../../core/api/models/tariff';
import { TariffsApiService } from '../../core/api/tariffs-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { TariffBandForm } from './tariff-band-form';

/** Tariffs: what charging costs, with the prices in force and the sites that use each one. */
@Component({
  selector: 'ww-tariffs',
  imports: [MatButtonModule, MatButtonToggleModule, MatIconModule, MatTableModule, RouterLink],
  templateUrl: './tariffs.component.html',
  styleUrl: './tariffs.component.scss',
})
export class TariffsComponent implements OnInit {
  protected readonly permissions = inject(PermissionsService);
  private readonly tariffsApi = inject(TariffsApiService);

  protected readonly columns = ['name', 'prices', 'sites', 'version'];
  protected readonly tariffs = signal<Tariff[]>([]);
  protected readonly status = signal<'active' | 'archived'>('active');
  protected readonly error = signal('');

  ngOnInit(): void {
    void this.load();
  }

  protected async show(status: 'active' | 'archived'): Promise<void> {
    this.status.set(status);
    await this.load();
  }

  /** "Peak 0.40, Off-peak 0.30 per kWh". */
  protected pricesOf(tariff: Tariff): string {
    const bands = tariff.current_version.bands;
    const prices = bands.map(
      (band) => `${band.name} ${TariffBandForm.trim(band.energy_price_per_kwh)}`,
    );
    return `${prices.join(', ')} ${tariff.currency} per kWh`;
  }

  private async load(): Promise<void> {
    try {
      this.tariffs.set((await firstValueFrom(this.tariffsApi.list(this.status()))).items);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}
