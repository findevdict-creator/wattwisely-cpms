import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { DriverApiService } from '@wattwisely/driver-core';
import { of, throwError } from 'rxjs';
import { DriverAuthService } from '../../core/auth/driver-auth.service';
import { FileSaver } from '../../core/files/file-saver';
import { AccountDataStore } from './account-data.store';

describe('AccountDataStore', () => {
  const setUp = (api: Partial<Record<keyof DriverApiService, jest.Mock>>) => {
    const auth = { deleteLogin: jest.fn() };
    const saver = { save: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        AccountDataStore,
        { provide: DriverApiService, useValue: api },
        { provide: DriverAuthService, useValue: auth },
        { provide: FileSaver, useValue: saver },
      ],
    });
    return { store: TestBed.inject(AccountDataStore), auth, saver };
  };

  it('saves everything held about the driver as one JSON file', async () => {
    const file = new Blob(['{}']);
    const { store, saver } = setUp({ exportData: jest.fn(() => of(file)) });
    await store.download();
    expect(saver.save).toHaveBeenCalledWith(file, 'my-wattwisely-data.json');
  });

  it('erases the account, then sends the driver to delete the login', async () => {
    const { store, auth } = setUp({ deleteMe: jest.fn(() => of(undefined)) });
    await store.delete();
    expect(auth.deleteLogin).toHaveBeenCalled();
  });

  it('keeps the login when the API could not erase the account', async () => {
    const failed = new HttpErrorResponse({ status: 500, error: { detail: 'Try again later.' } });
    const { store, auth } = setUp({ deleteMe: jest.fn(() => throwError(() => failed)) });
    await store.delete();
    expect(auth.deleteLogin).not.toHaveBeenCalled();
    expect(store.error()).toBe('Try again later.');
  });
});
