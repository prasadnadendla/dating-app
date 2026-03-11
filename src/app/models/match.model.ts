import { DatingProfile } from './user.model';

export interface LastMessage {
  content: string;
  createdAt: string;
  type: 'text' | 'voice' | 'icebreaker';
  senderId: string;
}

export interface Match {
  id: string;
  matchedAt: string;
  profile: DatingProfile;
  lastMessage?: LastMessage;
  unreadCount: number;
}
