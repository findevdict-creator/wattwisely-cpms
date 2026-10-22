import { Clipboard } from '@angular/cdk/clipboard';
import { Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ChargerSetupCard } from '../../core/api/models/charger';

/** What to type into the charger: address, identity and, this once, the password (story AST-02). */
@Component({
  selector: 'ww-setup-card',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './setup-card.component.html',
  styleUrl: './setup-card.component.scss',
})
export class SetupCardComponent {
  readonly setup = input.required<ChargerSetupCard>();
  private readonly clipboard = inject(Clipboard);
  private readonly snackBar = inject(MatSnackBar);

  protected copy(label: string, value: string): void {
    this.clipboard.copy(value);
    this.snackBar.open(`${label} copied.`, undefined, { duration: 2500 });
  }
}
