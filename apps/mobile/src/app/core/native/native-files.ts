import { Injectable, inject } from '@angular/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { NativePlatform } from './native-platform';

/**
 * A file the API sent: a receipt's PDF, the charges as CSV, the driver's data (module 33).
 * A phone writes it to the app's cache and opens the share sheet, so the driver can keep it
 * in Files, mail it or print it; a browser downloads it.
 */
@Injectable({ providedIn: 'root' })
export class NativeFiles {
  private readonly platform = inject(NativePlatform);

  async share(file: Blob, name: string): Promise<void> {
    if (!this.platform.isNative()) {
      return this.download(file, name);
    }
    const written = await Filesystem.writeFile({
      path: name,
      data: await this.base64(file),
      directory: Directory.Cache,
    });
    try {
      await Share.share({ title: name, files: [written.uri] });
    } catch (error) {
      // Closing the share sheet without choosing anything is not a failure.
      if (!/cancel/i.test((error as Error).message)) {
        throw error;
      }
    }
  }

  private download(file: Blob, name: string): void {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  private base64(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
