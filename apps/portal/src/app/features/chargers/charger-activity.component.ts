import { DatePipe, JsonPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableModule } from '@angular/material/table';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { StatusLabels } from '../../shared/status-labels';
import { ChargerActivityStore } from './charger-activity.store';

/** The recent commands and raw OCPP messages of a charger, for checking what it did and said. */
@Component({
  selector: 'ww-charger-activity',
  imports: [
    DatePipe,
    JsonPipe,
    MatCardModule,
    MatExpansionModule,
    MatTableModule,
    StatusChipComponent,
  ],
  templateUrl: './charger-activity.component.html',
  styleUrl: './charger-activity.component.scss',
})
export class ChargerActivityComponent {
  static readonly COMMAND_COLUMNS = ['when', 'action', 'who', 'status'];
  static readonly MESSAGE_COLUMNS = ['when', 'direction', 'action', 'payload'];

  protected readonly activity = inject(ChargerActivityStore);
  protected readonly commandColumns = ChargerActivityComponent.COMMAND_COLUMNS;
  protected readonly messageColumns = ChargerActivityComponent.MESSAGE_COLUMNS;

  protected actionLabel(action: string): string {
    return StatusLabels.commandAction(action);
  }

  protected direction(message: { direction: string; message_type: string }): string {
    const arrow = message.direction === 'in' ? '← charger' : '→ charger';
    return message.message_type === 'call'
      ? arrow
      : `${arrow} (${message.message_type === 'call_error' ? 'error' : 'reply'})`;
  }
}
