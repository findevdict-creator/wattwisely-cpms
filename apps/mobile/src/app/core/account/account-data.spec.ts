import { TestBed } from '@angular/core/testing';
import { DriverApiService } from '@wattwisely/driver-core';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { SignOut } from '../auth/sign-out';
import { NativeFiles } from '../native/native-files';
import { AccountData } from './account-data';

describe('AccountData', () => {
  function setUp(isDeleteRefused = false) {
    const file = new Blob(['{}'], { type: 'application/json' });
    const api = {
      exportData: jest.fn(() => of(file)),
      deleteMe: jest.fn(() =>
        isDeleteRefused
          ? throwError(
              () => new HttpErrorResponse({ status: 500, error: { detail: 'Try again.' } }),
            )
          : of(undefined),
      ),
    };
    const files = { share: jest.fn(async () => undefined) };
    const signOut = { run: jest.fn(async () => undefined) };
    TestBed.configureTestingModule({
      providers: [
        { provide: DriverApiService, useValue: api },
        { provide: NativeFiles, useValue: files },
        { provide: SignOut, useValue: signOut },
      ],
    });
    return { data: TestBed.inject(AccountData), file, files, signOut };
  }

  it('hands the driver’s data to the share sheet as one JSON file', async () => {
    const { data, file, files } = setUp();
    await data.download();
    expect(files.share).toHaveBeenCalledWith(file, 'my-wattwisely-data.json');
  });

  it('deletes the account, then signs out and opens Keycloak’s page for the login', async () => {
    const { data, signOut } = setUp();
    await data.delete();
    expect(signOut.run).toHaveBeenCalledWith(true);
  });

  it('keeps the driver signed in when the API could not delete the account', async () => {
    const { data, signOut } = setUp(true);
    await data.delete();
    expect(signOut.run).not.toHaveBeenCalled();
    expect(data.error()).toBe('Try again.');
  });
});
