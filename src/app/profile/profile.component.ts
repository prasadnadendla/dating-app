import { Component, inject, signal, computed, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { QueryService } from '../query.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { DatingProfile, Intent } from '../models/user.model';
import { ImageUrlPipe } from '../elements/image-url.pipe';

const GET_MY_PROFILE = `
  query GetMyProfile($uid: uuid!) {
    da_users_by_pk(id: $uid) {
      id name age gender city photos voice_intro_url
      intent tags mother_tongue religion community
      education profession is_verified verified_type
      is_premium spark_pass_expiry is_onboarded
    }
  }
`;

const UPDATE_PROFILE = `
  mutation UpdateDatingProfile($id: uuid!, $input: da_users_set_input!) {
    update_da_users_by_pk(pk_columns: {id: $id}, _set: $input) {
      id name age city photos intent tags mother_tongue
      religion community education profession voice_intro_url
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
  imports: [FormsModule, ImageUrlPipe],
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

  private mapProfile(row: any): DatingProfile {
    return {
      id: row.id,
      name: row.name,
      age: row.age,
      gender: row.gender,
      city: row.city,
      photos: row.photos ?? [],
      voiceIntroUrl: row.voice_intro_url,
      intent: row.intent,
      tags: row.tags ?? [],
      motherTongue: row.mother_tongue,
      religion: row.religion,
      community: row.community,
      education: row.education,
      profession: row.profession,
      isVerified: row.is_verified,
      verifiedType: row.verified_type,
      isPremium: row.is_premium,
      sparkPassExpiry: row.spark_pass_expiry,
      isOnboarded: row.is_onboarded,
    };
  }

  ngOnInit() {
    this.queryService.watchQuery<{ da_users_by_pk: DatingProfile }>(GET_MY_PROFILE, { uid: this.authService.userId() })
      .valueChanges.subscribe({
        next: ({ data }) => {
          this.profile.set(data?.da_users_by_pk ? this.mapProfile(data.da_users_by_pk) : null);
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
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
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
      const result = await this.queryService.mutate<{ update_da_users_by_pk: any }>(
        UPDATE_PROFILE,
        {
          id: this.profile()?.id,
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
      if (result?.data?.update_da_users_by_pk) {
        const updated = this.mapProfile(result.data.update_da_users_by_pk);
        this.profile.update(p => ({ ...p!, ...updated }));
        this.authService.setUser({ ...this.authService.currentUser()!, ...updated });
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
