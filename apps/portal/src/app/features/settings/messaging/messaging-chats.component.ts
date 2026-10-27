import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../../core/api/api-problem';
import { MessagingApiService } from '../../../core/api/messaging-api.service';
import { ChatMessage, Conversation } from '../../../core/api/models/messaging';
import { DayLabel } from '../../../shared/day-label';
import { StatusLabels } from '../../../shared/status-labels';

/** The chats on the WhatsApp number: the list on the left, the open one as bubbles beside it. */
@Component({
  selector: 'ww-messaging-chats',
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule, EmptyStateComponent],
  templateUrl: './messaging-chats.component.html',
  styleUrl: './messaging-chats.component.scss',
})
export class MessagingChatsComponent implements OnInit {
  private readonly api = inject(MessagingApiService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly conversations = signal<Conversation[]>([]);
  protected readonly selected = signal<Conversation | null>(null);
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly error = signal('');

  ngOnInit(): void {
    void this.load();
  }

  /** Loads the list again, and the open chat with it. */
  async refresh(): Promise<void> {
    try {
      await this.loadConversations();
    } catch (error) {
      this.snackBar.open(ApiProblem.from(error).detail, 'OK', { duration: 6000 });
      return;
    }
    const selected = this.selected();
    if (selected) {
      await this.open(selected);
    }
  }

  protected plugOf(conversation: Conversation): string {
    return conversation.charger_identity
      ? `${conversation.charger_identity} plug ${conversation.ocpp_connector_id}`
      : 'No charger yet';
  }

  protected chargeOf(conversation: Conversation): string {
    return conversation.session_status
      ? StatusLabels.session(conversation.session_status).toLowerCase()
      : '';
  }

  /** "16:42" today, "Yesterday" or "26 Oct" before. */
  protected whenOf(conversation: Conversation): string {
    const day = DayLabel.day(conversation.updated_at);
    return day === 'Today' ? DayLabel.time(conversation.updated_at) : day;
  }

  protected async open(conversation: Conversation): Promise<void> {
    this.selected.set(conversation);
    try {
      this.messages.set(await firstValueFrom(this.api.listMessages(conversation.id)));
    } catch (error) {
      this.snackBar.open(ApiProblem.from(error).detail, 'OK', { duration: 6000 });
    }
  }

  private async load(): Promise<void> {
    try {
      await this.loadConversations();
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
      return;
    }
    const first = this.conversations()[0];
    if (first) {
      await this.open(first);
    }
  }

  private async loadConversations(): Promise<void> {
    this.conversations.set(await firstValueFrom(this.api.listConversations()));
  }
}
