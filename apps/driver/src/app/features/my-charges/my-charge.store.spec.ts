import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { DriverChargeDetail, DriverChargesApiService } from '@wattwisely/driver-core';
import { of, throwError } from 'rxjs';
import { FileSaver } from '../../core/files/file-saver';
import { MyChargeStore } from './my-charge.store';

describe('MyChargeStore', () => {
  const charge = (status: string, paymentStatus: string | null) =>
    ({
      id: 'session-1',
      status,
      site_name: 'Riverside Car Park',
      time_zone: 'Europe/Dublin',
      started_at: '2026-10-21T18:00:00Z',
      charger_identity: 'SIM-001',
      ocpp_connector_id: 1,
      payment: paymentStatus ? { status: paymentStatus } : null,
    }) as DriverChargeDetail;

  const setUp = (api: Partial<Record<keyof DriverChargesApiService, jest.Mock>>) => {
    const saver = { save: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        MyChargeStore,
        { provide: DriverChargesApiService, useValue: { place: jest.fn(() => of({})), ...api } },
        { provide: FileSaver, useValue: saver },
      ],
    });
    return { store: TestBed.inject(MyChargeStore), saver };
  };

  afterEach(() => jest.useRealTimers());

  it('keeps following until the session ended and its hold was settled', () => {
    expect(MyChargeStore.isSettled(charge('charging', 'authorised'))).toBe(false);
    expect(MyChargeStore.isSettled(charge('completed', 'authorised'))).toBe(false);
    expect(MyChargeStore.isSettled(charge('completed', 'captured'))).toBe(true);
    expect(MyChargeStore.isSettled(charge('completed', null))).toBe(true);
    expect(MyChargeStore.isSettled(charge('not_started', 'failed'))).toBe(true);
  });

  it('follows a live charge every 3 seconds, with the readings every third time', async () => {
    jest.useFakeTimers();
    const api = {
      charge: jest.fn(() => of(charge('charging', 'authorised'))),
      readings: jest.fn(() => of([])),
    };
    const { store } = setUp(api);
    await store.follow('session-1');
    for (let tick = 0; tick < 3; tick++) {
      await jest.advanceTimersByTimeAsync(MyChargeStore.POLL_MS);
    }
    expect(api.charge).toHaveBeenCalledTimes(4);
    expect(api.readings).toHaveBeenCalledTimes(2);
    store.ngOnDestroy();
  });

  it('saves the receipt as a PDF named after the day and the site', async () => {
    const pdf = new Blob(['%PDF']);
    const { store, saver } = setUp({
      charge: jest.fn(() => of(charge('completed', 'captured'))),
      receiptPdf: jest.fn(() => of(pdf)),
    });
    await store.follow('session-1');
    await store.download();
    expect(saver.save).toHaveBeenCalledWith(pdf, 'receipt-2026-10-21-riverside-car-park.pdf');
  });

  it('says the receipt is not ready before the charge is priced', async () => {
    const notReady = new HttpErrorResponse({ status: 409, error: { detail: 'receipt_not_ready' } });
    const { store, saver } = setUp({
      charge: jest.fn(() => of(charge('completed', 'captured'))),
      receiptPdf: jest.fn(() => throwError(() => notReady)),
    });
    await store.follow('session-1');
    await store.download();
    expect(saver.save).not.toHaveBeenCalled();
    expect(store.error()).toBe(MyChargeStore.NOT_READY);
  });
});
