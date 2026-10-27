/** Hands a file the API sent to the browser as a download. */
export class FileDownload {
  static save(file: Blob, fileName: string): void {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
