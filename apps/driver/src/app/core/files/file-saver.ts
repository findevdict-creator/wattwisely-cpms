import { Injectable } from '@angular/core';

/** Hands a file the API sent to the browser as a download: the CSV of charges, a receipt's PDF. */
@Injectable({ providedIn: 'root' })
export class FileSaver {
  save(file: Blob, name: string): void {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }
}
