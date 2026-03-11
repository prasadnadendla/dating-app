import { Component, inject, signal, computed, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { QueryService } from '../query.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { DatingProfile, Intent } from '../models/user.model';

const GET_MY_PROFILE = `
  query GetMyProfile {
    myProfile {
      id name age gender city photos voiceIntroUrl
      intent tags motherTongue religion community
      education profession isVerified verifiedType
      clubs { id name icon }
      isPremium sparkPassExpiry isOnboarded
    }
  }
`;

const UPDATE_PROFILE = `
  mutation UpdateDatingProfile($input: UpdateProfileInput!) {
    updateDatingProfile(input: $input) {
      id name age city photos intent tags motherTongue
      religion community education profession voiceIntroUrl
    }
  }
`;

const INTEREST_TAGS = [
  'Cricket', 'Bollywood', 'Fitness', 'Foodie', 'Travel', 'Books', 'Music',
  'Yoga', 'Gaming', 'Movies', 'Art', 'Tech', 'Cooking', 'Photography',
  'Hiking', 'Dance', 'Netflix', 'Coffee', 'Pets', 'Fashion'
];

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {
  private queryService = inject(QueryService);
  readonly authService = inject(AuthService);
  readonly router = inject(Router);
  private notification = inject(NotificationService);
  private platformId = inject(PLATFORM_ID);

  readonly INTEREST_TAGS = INTEREST_TAGS;
  readonly photoSlots = Array(6).fill(null);
  readonly intentOptions = [
    { value: 'serious' as Intent, label: 'Serious' },
    { value: 'marriage' as Intent, label: 'Marriage' },
    { value: 'casual' as Intent, label: 'Casual' },
  ];

  profile = signal<DatingProfile | null>(null);
  loading = signal(true);
  isEditing = signal(false);
  saving = signal(false);
  currentPhotoIndex = signal(0);
  isRecording = signal(false);
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  // Edit state
  editName = '';
  editAge = '';
  editCity = '';
  editProfession = '';
  editEducation = '';
  editIntent: Intent = 'serious';
  editTags = signal<string[]>([]);
  editPhotos = signal<string[]>([]);

  readonly photos = computed(() => this.profile()?.photos ?? []);

  ngOnInit() {
    this.queryService.watchQuery<{ myProfile: DatingProfile }>(GET_MY_PROFILE)
      .valueChanges.subscribe({
        next: ({ data }) => {
          this.profile.set((data?.myProfile as DatingProfile) ?? null);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  startEdit() {
    const p = this.profile();
    if (!p) return;
    this.editName = p.name;
    this.editAge = String(p.age);
    this.editCity = p.city;
    this.editProfession = p.profession ?? '';
    this.editEducation = p.education ?? '';
    this.editIntent = p.intent;
    this.editTags.set([...p.tags]);
    this.editPhotos.set([...p.photos]);
    this.isEditing.set(true);
  }

  cancelEdit() { this.isEditing.set(false); }

  toggleTag(tag: string) {
    this.editTags.update(tags => {
      if (tags.includes(tag)) return tags.filter(t => t !== tag);
      if (tags.length >= 5) return tags;
      return [...tags, tag];
    });
  }

  removePhoto(index: number) {
    this.editPhotos.update(p => p.filter((_, i) => i !== index));
  }

  async onPhotoSelect(event: Event, index: number) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const result = await this.queryService.uploadImage(file);
      this.editPhotos.update(p => {
        const arr = [...p];
        arr[index] = result.url;
        return arr.filter(Boolean);
      });
    } catch {
      this.notification.error('Photo upload failed');
    }
  }

  async saveProfile() {
    this.saving.set(true);
    try {
      const result = await this.queryService.mutate<{ updateDatingProfile: DatingProfile }>(
        UPDATE_PROFILE,
        {
          input: {
            name: this.editName,
            age: +this.editAge,
            city: this.editCity,
            profession: this.editProfession,
            education: this.editEducation,
            intent: this.editIntent,
            tags: this.editTags(),
            photos: this.editPhotos(),
          }
        }
      ).toPromise();
      if (result?.data?.updateDatingProfile) {
        this.profile.update(p => ({ ...p!, ...result.data!.updateDatingProfile }));
        this.authService.setUser({ ...this.authService.currentUser()!, ...result.data.updateDatingProfile });
      }
      this.isEditing.set(false);
      this.notification.success('Profile updated!');
    } catch {
      this.notification.error('Failed to save profile');
    } finally {
      this.saving.set(false);
    }
  }

  playVoiceIntro() {
    if (!isPlatformBrowser(this.platformId)) return;
    const url = this.profile()?.voiceIntroUrl;
    if (url) new Audio(url).play();
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
        const file = new File([blob], 'voice-intro.webm', { type: 'audio/webm' });
        try {
          const { url } = await this.queryService.uploadImage(file);
          this.profile.update(p => p ? { ...p, voiceIntroUrl: url } : p);
          this.notification.success('Voice intro saved!');
        } catch { this.notification.error('Failed to save voice intro'); }
      };
      this.mediaRecorder.start();
      this.isRecording.set(true);
      // Auto-stop at 30s
      setTimeout(() => { if (this.isRecording()) this.toggleVoiceRecord(); }, 30000);
    } catch { this.notification.error('Microphone access denied'); }
  }
}
