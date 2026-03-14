import { Component, inject, signal, OnInit, AfterViewInit, ElementRef, viewChild, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { QueryService } from '../../query.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Message } from '../../models/message.model';
import { DatingProfile } from '../../models/user.model';
import { ImageUrlPipe } from '../../elements/image-url.pipe';

const GET_MESSAGES = `
  query GetMessages($matchId: ID!, $cursor: String) {
    chatMessages(matchId: $matchId, cursor: $cursor) {
      messages { id content type senderId createdAt voiceUrl }
      nextCursor
      matchProfile { id name age photos isVerified gender }
    }
  }
`;

const SEND_MESSAGE = `
  mutation SendMessage($matchId: ID!, $content: String!, $type: String!) {
    sendMessage(matchId: $matchId, content: $content, type: $type) {
      id content type senderId createdAt voiceUrl
    }
  }
`;

const REPORT_USER = `
  mutation ReportUser($userId: ID!, $reason: String!) {
    reportUser(userId: $userId, reason: $reason) { success }
  }
`;

const ICEBREAKERS = [
  '☕ Coffee or chai?',
  '🎬 Favourite Bollywood movie?',
  '🌍 Dream travel destination?',
  '🎵 What are you listening to lately?',
  '🍕 Pizza or biryani — which side are you on?',
];

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [FormsModule, ImageUrlPipe],
  templateUrl: './chat-room.component.html'
})
export class ChatRoomComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private queryService = inject(QueryService);
  private authService = inject(AuthService);
  private notification = inject(NotificationService);
  private platformId = inject(PLATFORM_ID);
  readonly router = inject(Router);

  private messagesEl = viewChild<ElementRef>('messagesEl');

  readonly ICEBREAKERS = ICEBREAKERS;
  readonly reportReasons = [
    'Fake profile', 'Inappropriate content', 'Harassment', 'Scam or spam', 'Other'
  ];

  matchId = '';
  messages = signal<Message[]>([]);
  matchProfile = signal<DatingProfile | null>(null);
  loading = signal(true);
  messageText = '';
  sending = signal(false);
  showMenu = signal(false);
  showReportSheet = signal(false);
  isRecording = signal(false);
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  // Women message first: women (female) can always send; men wait until women send first
  readonly canMessage = signal(true);
  readonly isWomenFirst = signal(false);

  readonly myId = this.authService.userId;

  ngOnInit() {
    this.matchId = this.route.snapshot.paramMap.get('matchId') ?? '';
    this.loadMessages();
  }

  ngAfterViewInit() {
    this.scrollToBottom();
  }

  private loadMessages() {
    this.queryService.watchQuery<{ chatMessages: { messages: Message[]; nextCursor: string; matchProfile: DatingProfile } }>(
      GET_MESSAGES,
      { matchId: this.matchId }
    ).valueChanges.subscribe({
      next: ({ data }) => {
        const chatMessages = data?.chatMessages;
        const messages = (chatMessages?.messages as Message[]) ?? [];
        const matchProfile = (chatMessages?.matchProfile as DatingProfile) ?? null;
        this.messages.set(messages);
        this.matchProfile.set(matchProfile);
        this.loading.set(false);

        // Women-first logic: if current user is male and no messages yet
        const me = this.authService.currentUser();
        if (me?.gender === 'male' && messages.length === 0) {
          this.canMessage.set(false);
          this.isWomenFirst.set(true);
        } else {
          this.canMessage.set(true);
        }

        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: () => this.loading.set(false)
    });
  }

  onEnterKey(event: Event) {
    const ke = event as KeyboardEvent;
    if (ke.shiftKey) return;
    ke.preventDefault();
    this.sendMessage();
  }

  isMine(msg: Message): boolean {
    return msg.senderId === this.myId();
  }

  async sendMessage() {
    const content = this.messageText.trim();
    if (!content) return;
    this.messageText = '';
    this.sending.set(true);
    try {
      const result = await this.queryService.mutate<{ sendMessage: Message }>(
        SEND_MESSAGE,
        { matchId: this.matchId, content, type: 'text' }
      ).toPromise();
      if (result?.data?.sendMessage) {
        this.messages.update(m => [...m, result.data!.sendMessage]);
        this.canMessage.set(true);
        setTimeout(() => this.scrollToBottom(), 50);
      }
    } catch {
      this.notification.error('Failed to send message');
      this.messageText = content;
    } finally {
      this.sending.set(false);
    }
  }

  sendIcebreaker(text: string) {
    this.messageText = text;
    this.sendMessage();
  }

  async toggleVoiceRecord() {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.isRecording()) {
      this.mediaRecorder?.stop();
      this.isRecording.set(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = e => this.audioChunks.push(e.data);
      this.mediaRecorder.onstop = async () => {
        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        await this.sendVoiceMessage(blob);
      };
      this.mediaRecorder.start();
      this.isRecording.set(true);
    } catch {
      this.notification.error('Microphone access denied');
    }
  }

  private async sendVoiceMessage(blob: Blob) {
    try {
      const file = new File([blob], 'voice.webm', { type: 'audio/webm' });
      const { url } = await this.queryService.uploadImage(file);
      const result = await this.queryService.mutate<{ sendMessage: Message }>(
        SEND_MESSAGE,
        { matchId: this.matchId, content: url, type: 'voice' }
      ).toPromise();
      if (result?.data?.sendMessage) {
        this.messages.update(m => [...m, result.data!.sendMessage]);
        setTimeout(() => this.scrollToBottom(), 50);
      }
    } catch {
      this.notification.error('Failed to send voice message');
    }
  }

  playVoice(msg: Message) {
    if (!isPlatformBrowser(this.platformId) || !msg.voiceUrl) return;
    new Audio(msg.voiceUrl).play();
  }

  async blockUser() {
    this.showMenu.set(false);
    this.notification.info('User blocked');
    this.router.navigate(['/matches']);
  }

  async submitReport(reason: string) {
    const profileId = this.matchProfile()?.id;
    if (!profileId) return;
    this.showReportSheet.set(false);
    try {
      await this.queryService.mutate(REPORT_USER, { userId: profileId, reason }).toPromise();
      this.notification.success('Report submitted. Thank you.');
    } catch {
      this.notification.error('Failed to submit report');
    }
  }

  autoResize(event: Event) {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
  }

  private scrollToBottom() {
    const el = this.messagesEl()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  timeStr(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
}
