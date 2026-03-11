export type MessageType = 'text' | 'voice' | 'icebreaker';

export interface Message {
  id: string;
  content: string;
  type: MessageType;
  senderId: string;
  createdAt: string;
  voiceUrl?: string;
}
