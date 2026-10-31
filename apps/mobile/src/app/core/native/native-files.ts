import { Injectable, inject } from '@angular/core';
import { FileViewer } from '@capacitor/file-viewer';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { NativePlatform } from './native-platform';

/**
 * A file the API sent: a receipt's PDF, the charges as CSV, the driver's data (module 33).
 * A phone writes it to the app's cache, then opens a receipt in the phone's PDF viewer, and
 * hands the other files to the share sheet, so the driver can keep them in Files, mail them
 * or print them; a browser downloads them.
 */
@Injectable({ providedIn: 'root' })
export class NativeFiles {
  private readonly platform = inject(NativePlatform);

  /** The phone's own viewer (a PDF viewer), or the share sheet when it has none. */
  async open(file: Blob, name: string): Promise<void> {
    if (!this.platform.isNative()) {
      return this.download(file, name);
    }
    const uri = await this.write(file, name);
    try {
      await FileViewer.openDocumentFromLocalPath({ path: uri });
    } catch {
      await this.shareUri(uri, name);
    }
  }

  async share(file: Blob, name: string): Promise<void> {
    if (!this.platform.isNative()) {
      return this.download(file, name);
    }
    await this.shareUri(await this.write(file, name), name);
  }

  private async write(file: Blob, name: string): Promise<string> {
    const written = await Filesystem.writeFile({
      path: name,
      data: await this.base64(file),
      directory: Directory.Cache,
    });
    return written.uri;
  }

  private async shareUri(uri: string, name: string): Promise<void> {
    try {
      await Share.share({ title: name, files: [uri] });
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
