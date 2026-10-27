import { Clipboard } from '@angular/cdk/clipboard';
import { Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../../core/api/api-problem';
import { MessagingApiService } from '../../../core/api/messaging-api.service';
import { MessagingChannel } from '../../../core/api/models/messaging';
import { PermissionsService } from '../../../core/permissions/permissions.service';
import { DayLabel } from '../../../shared/day-label';
import { MessagingChannelForm } from './messaging-channel-form';
import { MessagingChatsComponent } from './messaging-chats.component';

/** Settings > WhatsApp charging (module 17): the number drivers write to, and the chats on it. */
@Component({
  selector: 'ww-messaging',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    MessagingChatsComponent,
  ],
  templateUrl: './messaging.component.html',
  styleUrl: './messaging.component.scss',
})
export class MessagingComponent implements OnInit {
  protected readonly permissions = inject(PermissionsService);
  private readonly api = inject(MessagingApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly clipboard = inject(Clipboard);
  private readonly chats = viewChild(MessagingChatsComponent);

  protected readonly channel = signal<MessagingChannel | null>(null);
  protected readonly form = signal(new MessagingChannelForm());
  protected readonly testNumber = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(6)],
  });
  protected readonly isSaving = signal(false);
  protected readonly error = signal('');

  protected readonly savedLine = computed(() => {
    const channel = this.channel();
    if (!channel?.version || !channel.updated_at) {
      return 'Not saved yet';
    }
    return `Version ${channel.version}, saved ${DayLabel.inSentence(channel.updated_at)}`;
  });
  protected readonly state = computed(() => {
    const channel = this.channel();
    if (!channel?.version) {
      return { label: 'Not set up', tone: 'neutral' };
    }
    return channel.is_active ? { label: 'Answering', tone: 'ok' } : { label: 'Off', tone: 'warn' };
  });
  protected readonly tokenHint = computed(() => {
    const channel = this.channel();
    if (channel?.has_access_token) {
      return 'Leave empty to keep the stored token.';
    }
    return channel?.is_platform_token_configured
      ? "Optional: Wattwisely's own token is used when your number is in its account."
      : 'Needed: a permanent token from your Meta app.';
  });

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
      await this.chats()?.refresh();
    } catch (error) {
      this.snackBar.open(ApiProblem.from(error).detail, 'OK', { duration: 6000 });
    }
  }

  private async load(): Promise<void> {
    try {
      this.applyChannel(await firstValueFrom(this.api.getChannel()));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  private applyChannel(channel: MessagingChannel): void {
    this.channel.set(channel);
    this.form.set(MessagingChannelForm.of(channel));
  }
}
