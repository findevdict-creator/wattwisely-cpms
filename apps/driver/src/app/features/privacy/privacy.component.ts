import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { BrandService } from '../../core/branding/brand.service';
import { AccountStore } from '../account/account.store';
import { AccountDataStore } from './account-data.store';

/**
 * "Privacy and data" (module 38), as in the mobile app: the operators that hold a record of
 * the driver, the download of everything held about them, and deleting the account, asked
 * twice before it happens.
 */
@Component({
  selector: 'ww-privacy',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatProgressSpinnerModule, RouterLink],
  providers: [AccountStore, AccountDataStore],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss',
})
export class PrivacyComponent implements OnInit {
  protected readonly store = inject(AccountStore);
  protected readonly data = inject(AccountDataStore);
  protected readonly isDeleteAsked = signal(false);

  constructor() {
    inject(BrandService).reset();
  }

  ngOnInit(): void {
    void this.store.load();
  }
}
