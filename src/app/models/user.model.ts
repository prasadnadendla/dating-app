export type Intent = 'casual' | 'serious' | 'marriage';
export type Gender = 'male' | 'female' | 'other';
export type VerificationType = 'selfie' | 'aadhaar';

export interface DatingProfile {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  city: string;
  phone?: string;
  photos: string[];
  voiceIntroUrl?: string;
  intent: Intent;
  tags: string[];
  motherTongue?: string;
  religion?: string;
  community?: string;
  education?: string;
  profession?: string;
  isVerified: boolean;
  verifiedType?: VerificationType;
  compatibilityScore?: number;
  clubs?: { id: string; name: string; icon: string }[];
  isPremium?: boolean;
  sparkPassExpiry?: string;
  isOnboarded?: boolean;
}

export interface SwipeResult {
  isMatch: boolean;
  matchId?: string;
}
