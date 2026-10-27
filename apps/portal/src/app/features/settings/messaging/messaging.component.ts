import { Clipboard } from '@angular/cdk/clipboard';
import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../../core/api/api-problem';
import { MessagingApiService } from '../../../core/api/messaging-api.service';
import { ChatMessage, Conversation, MessagingChannel } from '../../../core/api/models/messaging';
import { PermissionsService } from '../../../core/permissions/permissions.service';
import { MessagingChannelForm } from './messaging-channel-form';

/** Settings > WhatsApp charging (module 17): the number drivers write to, and the chats on it. */
@Component({
  selector: 'ww-messaging',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    MatTableModule,
  ],
  templateUrl: './messaging.component.html',
  styleUrl: './messaging.component.scss',
})
export class MessagingComponent implements OnInit {
  protected readonly permissions = inject(PermissionsService);
  private readonly api = inject(MessagingApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly clipboard = inject(Clipboard);

  protected readonly columns = ['contact', 'plug', 'charge', 'last'];
  protected readonly channel = signal<MessagingChannel | null>(null);
  protected readonly form = signal(new MessagingChannelForm());
  protected readonly testNumber = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(6)],
  });
  protected readonly conversations = signal<Conversation[]>([]);
  protected readonly selected = signal<Conversation | null>(null);
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly isSaving = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    void this.load();
  }

  protected isLocked(): boolean {
    return this.permissions.isModuleLocked('messaging_charging');
  }

  protected canManage(): boolean {
    return this.permissions.canChange('messaging:manage') && !this.isLocked();
  }

  protected copyWebhookUrl(channel: MessagingChannel): void {
    this.clipboard.copy(channel.webhook_url);
    this.snackBar.open('Webhook address copied.', 'OK', { duration: 3000 });
  }

  protected plugOf(conversation: Conversation): string {
    return conversation.charger_identity
      ? `${conversation.charger_identity} plug ${conversation.ocpp_connector_id}`
      : '—';
  }

  protected async save(): Promise<void> {
    const channel = this.channel();
    const form = this.form();
    if (!channel || !form.isValid()) {
      return;
    }
    this.isSaving.set(true);
    try {
      const input = form.toInput(channel.has_access_token);
      this.applyChannel(await firstValueFrom(this.api.saveChannel(channel.version, input)));
      this.snackBar.open('WhatsApp channel saved.', 'OK', { duration: 4000 });
    } catch (error) {
      this.snackBar.open(ApiProblem.from(error).detail, 'OK', { duration: 6000 });
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async sendTest(): Promise<void> {
    try {
      await firstValueFrom(this.api.sendTest(this.testNumber.value.trim()));
      this.snackBar.open('Test queued: it goes out within a few seconds.', 'OK', {
        duration: 4000,
      });
      await this.loadConversations();
    } catch (error) {
      this.snackBar.open(ApiProblem.from(error).detail, 'OK', { duration: 6000 });
    }
  }

  protected async open(conversation: Conversation): Promise<void> {
    this.selected.set(conversation);
    try {
      this.messages.set(await firstValueFrom(this.api.listMessages(conversation.id)));
    } catch (error) {
      this.snackBar.open(ApiProblem.from(error).detail, 'OK', { duration: 6000 });
    }
  }

  protected async refresh(): Promise<void> {
    await this.loadConversations();
    const selected = this.selected();
    if (selected) {
      await this.open(selected);
    }
  }

  private async load(): Promise<void> {
    try {
      this.applyChannel(await firstValueFrom(this.api.getChannel()));
      await this.loadConversations();
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  private async loadConversations(): Promise<void> {
    this.conversations.set(await firstValueFrom(this.api.listConversations()));
  }

  private applyChannel(channel: MessagingChannel): void {
    this.channel.set(channel);
    this.form.set(MessagingChannelForm.of(channel));
  }
}
