import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { ChargersApiService } from '../../core/api/chargers-api.service';
import { Charger, ConnectorQrCode } from '../../core/api/models/charger';
import { QrSheet } from './qr-sheet';

/** A plug's code with its drawing ready for the template. */
interface ShownQrCode extends ConnectorQrCode {
  drawing: SafeHtml;
}

/** The QR codes drivers scan on this charger, one per plug, and a printable sheet of them (module 7). */
@Component({
  selector: 'ww-qr-codes-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './qr-codes-dialog.component.html',
  styleUrl: './qr-codes-dialog.component.scss',
})
export class QrCodesDialogComponent {
  protected readonly charger = inject<Charger>(MAT_DIALOG_DATA);
  private readonly chargersApi = inject(ChargersApiService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly codes = signal<ShownQrCode[] | null>(null);
  protected readonly error = signal('');

  constructor() {
    void this.load();
  }

  /** Opens the sheet in a new tab, where the browser's print dialog comes up. */
  protected print(): void {
    const codes = this.codes() ?? [];
    const html = QrSheet.html(
      { chargerIdentity: this.charger.ocpp_identity, siteName: this.charger.site_name },
      codes,
    );
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    window.open(url, '_blank');
  }

  private async load(): Promise<void> {
    try {
      const codes = await firstValueFrom(this.chargersApi.qrCodes(this.charger.id));
      this.codes.set(
        codes.map((code) => ({
          ...code,
          // The SVG is drawn by the API from the plug's address; nothing in it comes from people.
          drawing: this.sanitizer.bypassSecurityTrustHtml(code.svg),
        })),
      );
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}
