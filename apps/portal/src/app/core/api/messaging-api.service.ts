import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import {
  ChatMessage,
  Conversation,
  MessagingChannel,
  MessagingChannelInput,
} from './models/messaging';

/** Calls /v1/messaging: the WhatsApp channel and the chats on it (module 17). */
@Injectable({ providedIn: 'root' })
export class MessagingApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  getChannel(): Observable<MessagingChannel> {
    return this.http.get<MessagingChannel>(this.url('channel'));
  }

  /** `version` is the channel's, 0 for the first save. */
  saveChannel(version: number, input: MessagingChannelInput): Observable<MessagingChannel> {
    return this.http.put<MessagingChannel>(this.url('channel'), input, {
      headers: { 'If-Match': String(version) },
    });
  }

  /** Queues a test message the worker sends within its interval. */
  sendTest(to: string): Observable<MessagingChannel> {
    return this.http.post<MessagingChannel>(this.url('channel/test'), { to });
  }

  listConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(this.url('conversations'));
  }

  listMessages(conversationId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(this.url(`conversations/${conversationId}/messages`));
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/messaging/${path}`;
  }
}
