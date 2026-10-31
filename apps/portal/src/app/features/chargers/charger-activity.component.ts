import { DatePipe, JsonPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { EmptyStateComponent } from '@wattwisely/ui';
import { OcppMessage } from '../../core/api/models/command';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { StatusLabels } from '../../shared/status-labels';
import { ChargerActivityStore } from './charger-activity.store';

/** Which messages the log shows: all, those from or to the charger, or only errors. */
export type MessageFilter = 'all' | 'in' | 'out' | 'errors';

/** The recent commands or raw OCPP messages of a charger, for checking what it did and said. */
@Component({
  selector: 'ww-charger-activity',
  imports: [DatePipe, EmptyStateComponent, JsonPipe, MatTableModule, StatusChipComponent],
  templateUrl: './charger-activity.component.html',
  styleUrl: './charger-activity.component.scss',
})
export class ChargerActivityComponent {
  static readonly COMMAND_COLUMNS = ['when', 'action', 'who', 'status'];
  static readonly MESSAGE_COLUMNS = ['when', 'direction', 'action', 'result', 'payload'];
  static readonly FILTERS: { key: MessageFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'in', label: 'In' },
    { key: 'out', label: 'Out' },
    { key: 'errors', label: 'Errors' },
  ];

  readonly view = input<'messages' | 'commands'>('messages');
  protected readonly activity = inject(ChargerActivityStore);
  protected readonly filters = ChargerActivityComponent.FILTERS;
  protected readonly filter = signal<MessageFilter>('all');
  protected readonly shown = computed(() =>
    ChargerActivityComponent.matching(this.activity.messages(), this.filter()),
  );
  protected readonly commandColumns = ChargerActivityComponent.COMMAND_COLUMNS;
  protected readonly messageColumns = ChargerActivityComponent.MESSAGE_COLUMNS;

  protected actionLabel(action: string): string {
    return StatusLabels.commandAction(action);
  }

  protected direction(message: OcppMessage): string {
    return message.direction === 'in' ? 'From the charger' : 'To the charger';
  }

  private static matching(messages: OcppMessage[], filter: MessageFilter): OcppMessage[] {
    if (filter === 'errors') {
      return messages.filter((message) => message.message_type === 'call_error');
    }
    return filter === 'all' ? messages : messages.filter((m) => m.direction === filter);
  }
}
