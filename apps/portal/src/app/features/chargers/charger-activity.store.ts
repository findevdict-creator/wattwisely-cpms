import { Injectable, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { CommandsApiService } from '../../core/api/commands-api.service';
import { ChargerEvent } from '../../core/api/models/charger-event';
import { ChargerCommand, OcppMessage } from '../../core/api/models/command';
import { ChargerLiveService } from '../../core/live/charger-live.service';
import { LiveStream } from '../../core/live/live-stream';
import { StatusLabels } from '../../shared/status-labels';

/**
 * The live side of a charger page: the stream of events, the commands sent from the
 * page and their outcomes, and the recent OCPP messages. Other events are handed to
 * whoever opened the store (the page), which keeps the charger itself up to date.
 */
@Injectable()
export class ChargerActivityStore {
  static readonly MESSAGES_REFRESH_MS = 1_500;

  private readonly commandsApi = inject(CommandsApiService);
  private readonly live = inject(ChargerLiveService);
  private readonly snackBar = inject(MatSnackBar);
  private stream: LiveStream | null = null;
  private refresh: ReturnType<typeof setTimeout> | null = null;
  private chargerId = '';

  readonly commands = signal<ChargerCommand[]>([]);
  readonly messages = signal<OcppMessage[]>([]);

  async start(chargerId: string, onEvent: (event: ChargerEvent) => void): Promise<void> {
    this.chargerId = chargerId;
    this.stream = this.live.open(chargerId, (event) => {
      this.scheduleMessagesRefresh();
      if (event.type === 'command.result') {
        void this.completed(event);
      } else {
        onEvent(event);
      }
    });
    await Promise.all([this.loadCommands(), this.loadMessages()]);
  }

  stop(): void {
    this.stream?.close();
    this.stream = null;
    if (this.refresh) {
      clearTimeout(this.refresh);
    }
  }

  /** Sends a command and shows it on the list; the charger's answer arrives on the stream. */
  async send(request: Observable<ChargerCommand>): Promise<void> {
    try {
      const command = await firstValueFrom(request);
      this.commands.update((commands) => [command, ...commands]);
      this.tell(
        `${StatusLabels.commandAction(command.action)} sent. Waiting for the charger's answer.`,
      );
    } catch (error) {
      this.tell(ApiProblem.from(error).detail);
    }
  }

  private async completed(event: ChargerEvent): Promise<void> {
    const commandId = String(event.data['command_id']);
    try {
      const command = await firstValueFrom(this.commandsApi.get(commandId));
      this.commands.update((commands) =>
        commands.some((item) => item.id === command.id)
          ? commands.map((item) => (item.id === command.id ? command : item))
          : [command, ...commands],
      );
      const outcome = StatusLabels.command(command.status).toLowerCase();
      this.tell(
        `${StatusLabels.commandAction(command.action)}: ${outcome}${command.error ? `. ${command.error}` : ''}`,
      );
    } catch {
      await this.loadCommands();
    }
  }

  private async loadCommands(): Promise<void> {
    try {
      this.commands.set(
        (await firstValueFrom(this.commandsApi.recentCommands(this.chargerId))).items,
      );
    } catch {
      this.commands.set([]);
    }
  }

  private async loadMessages(): Promise<void> {
    try {
      this.messages.set(
        (await firstValueFrom(this.commandsApi.recentMessages(this.chargerId))).items,
      );
    } catch {
      this.messages.set([]);
    }
  }

  /** Frames reach the log a moment after the event; one reload per burst is enough. */
  private scheduleMessagesRefresh(): void {
    if (this.refresh) {
      return;
    }
    this.refresh = setTimeout(() => {
      this.refresh = null;
      void this.loadMessages();
    }, ChargerActivityStore.MESSAGES_REFRESH_MS);
  }

  private tell(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 6000 });
  }
}
