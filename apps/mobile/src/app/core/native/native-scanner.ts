import { Injectable } from '@angular/core';
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerAndroidScanningLibrary,
  CapacitorBarcodeScannerTypeHint,
} from '@capacitor/barcode-scanner';

/**
 * The phone's camera reading a QR code (module 32): the plugin shows its own full-screen
 * scanner over the app and answers with the code's text. In a desktop browser it opens the
 * webcam. Kept behind this class so tests can stand in.
 */
@Injectable({ providedIn: 'root' })
export class NativeScanner {
  /** The code's text, or null when the driver closed the scanner or refused the camera. */
  async scan(): Promise<string | null> {
    try {
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
        scanInstructions: 'Point at the QR code on the plug',
        android: { scanningLibrary: CapacitorBarcodeScannerAndroidScanningLibrary.MLKIT },
      });
      return result.ScanResult || null;
    } catch {
      return null;
    }
  }
}
