import { Clipboard } from '@angular/cdk/clipboard';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CreatedApiKey } from '../../../core/api/models/api-key';

/** Shows a new key's token the one time it can be seen, with a button to copy it (module 16). */
@Component({
  selector: 'ww-created-key-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>{{ data.key.name }} is ready</h2>
    <mat-dialog-content>
      <p>
        Copy the key now and keep it somewhere safe: it is not stored and
        <strong>cannot be shown again</strong>. If it is lost, revoke it and make a new one.
      </p>
      <code class="token" data-testid="created-token">{{ data.token }}</code>
      <p class="hint">
        Send it as <code>Authorization: Bearer &lt;key&gt;</code> with every request. The company is
        known from the key, so no <code>X-Tenant-Id</code> header is needed.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button (click)="copy()" data-testid="copy-token">
        <mat-icon svgIcon="copy" />
        {{ isCopied() ? 'Copied' : 'Copy key' }}
      </button>
      <button mat-flat-button [mat-dialog-close]="true">Done</button>
    </mat-dialog-actions>
  `,
  styles: `
    .token {
      display: block;
      padding: 12px;
      border-radius: 8px;
      background: var(--mat-sys-surface-container-high);
      word-break: break-all;
      user-select: all;
    }
    .hint {
      color: var(--mat-sys-on-surface-variant);
      font-size: 13px;
    }
  `,
})
export class CreatedKeyDialogComponent {
  protected readonly data = inject<CreatedApiKey>(MAT_DIALOG_DATA);
  private readonly clipboard = inject(Clipboard);
  protected readonly isCopied = signal(false);

  protected copy(): void {
    this.clipboard.copy(this.data.token);
    this.isCopied.set(true);
  }
}
