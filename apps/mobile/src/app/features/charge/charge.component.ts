import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonInput } from '@ionic/angular';
import { NativeScanner } from '../../core/native/native-scanner';
import { PlugCode } from '../../core/charging/plug-code';

/**
 * The Charge tab (Figma 9, "Scan"): the camera reads the QR code on the plug, or the driver
 * types the code printed under it. Either way the plug's page opens; a code that names no
 * plug says so and stays here.
 */
@Component({
  selector: 'ww-charge',
  imports: [FormsModule, IonButton, IonContent, IonInput, MatIconModule],
  templateUrl: './charge.component.html',
  styleUrl: './charge.component.scss',
})
export class ChargeComponent {
  static readonly NOT_A_PLUG =
    'That is not a plug’s code. Scan the QR code on the charger, or type the code under it.';

  private readonly scanner = inject(NativeScanner);
  private readonly router = inject(Router);

  protected readonly isTyping = signal(false);
  protected readonly isScanning = signal(false);
  protected readonly code = signal('');
  protected readonly error = signal('');

  protected async scan(): Promise<void> {
    this.isScanning.set(true);
    this.error.set('');
    const text = await this.scanner.scan();
    this.isScanning.set(false);
    if (text !== null) {
      await this.open(text);
    }
  }

  protected async open(text: string): Promise<void> {
    const plug = PlugCode.parse(text);
    if (!plug) {
      this.error.set(ChargeComponent.NOT_A_PLUG);
      return;
    }
    this.error.set('');
    this.code.set('');
    await this.router.navigate(PlugCode.route(plug));
  }
}
