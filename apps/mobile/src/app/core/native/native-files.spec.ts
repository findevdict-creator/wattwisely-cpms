import { TestBed } from '@angular/core/testing';
import { FileViewer } from '@capacitor/file-viewer';
import { Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { NativeFiles } from './native-files';
import { NativePlatform } from './native-platform';

jest.mock('@capacitor/file-viewer', () => ({
  FileViewer: { openDocumentFromLocalPath: jest.fn() },
}));
jest.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: { writeFile: jest.fn(async () => ({ uri: 'file:///cache/receipt.pdf' })) },
}));
jest.mock('@capacitor/share', () => ({ Share: { share: jest.fn() } }));

describe('NativeFiles', () => {
  const pdf = new Blob(['%PDF'], { type: 'application/pdf' });
  let files: NativeFiles;
  let viewer: jest.Mock;
  let share: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    viewer = FileViewer.openDocumentFromLocalPath as jest.Mock;
    share = Share.share as jest.Mock;
    TestBed.configureTestingModule({
      providers: [{ provide: NativePlatform, useValue: { isNative: () => true } }],
    });
    files = TestBed.inject(NativeFiles);
  });

  it('opens a receipt in the phone’s viewer, not the share sheet', async () => {
    await files.open(pdf, 'receipt.pdf');
    expect(Filesystem.writeFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'receipt.pdf', directory: 'CACHE' }),
    );
    expect(viewer).toHaveBeenCalledWith({ path: 'file:///cache/receipt.pdf' });
    expect(share).not.toHaveBeenCalled();
  });

  it('falls back to the share sheet when the phone has no viewer for the file', async () => {
    viewer.mockRejectedValueOnce(new Error('No app to open this file'));
    await files.open(pdf, 'receipt.pdf');
    expect(share).toHaveBeenCalledWith({
      title: 'receipt.pdf',
      files: ['file:///cache/receipt.pdf'],
    });
  });

  it('hands other files to the share sheet', async () => {
    await files.share(new Blob(['a,b']), 'my-charges.csv');
    expect(viewer).not.toHaveBeenCalled();
    expect(share).toHaveBeenCalledWith({
      title: 'my-charges.csv',
      files: ['file:///cache/receipt.pdf'],
    });
  });
});
