import { Component, inject, signal, computed, effect, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { QueryService } from '../query.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { LocalStorageService } from '../local-storage.service';
import { Intent, Gender } from '../models/user.model';

const INTEREST_TAGS = [
  'Cricket', 'Bollywood', 'Fitness', 'Foodie', 'Travel', 'Books', 'Music',
  'Yoga', 'Gaming', 'Movies', 'Art', 'Tech', 'Cooking', 'Photography',
  'Hiking', 'Dance', 'Netflix', 'Coffee', 'Pets', 'Fashion'
];

const LANGUAGES = ['Hindi', 'English', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi'];

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './onboarding.component.html'
})
export class OnboardingComponent implements OnInit {
  private queryService = inject(QueryService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notification = inject(NotificationService);
  private localStorage = inject(LocalStorageService);

  private readonly STORAGE_KEY = 'onboarding_draft';

  readonly LANGUAGES = LANGUAGES;
  readonly INTEREST_TAGS = INTEREST_TAGS;
  readonly totalSteps = 5;
  readonly photoSlots = Array(6).fill(null);

  step = signal(1);
  loading = signal(false);
  error = signal('');
  photoUploading = signal(false);

  // Step 1
  intent = signal<Intent>('serious');
  // Step 2
  name = signal('');
  age = signal('');
  gender = signal<Gender>('female');
  // Step 3
  city = signal('');
  motherTongue = signal('');
  // Step 4
  photos = signal<string[]>([]);
  // Step 5
  selectedTags = signal<string[]>([]);

  constructor() {
    // Auto-save draft whenever any field changes
    effect(() => {
      const draft = {
        step: this.step(),
        intent: this.intent(),
        name: this.name(),
        age: this.age(),
        gender: this.gender(),
        city: this.city(),
        motherTongue: this.motherTongue(),
        photos: this.photos(),
        selectedTags: this.selectedTags(),
      };
      this.localStorage.set(this.STORAGE_KEY, JSON.stringify(draft));
    });
  }

  ngOnInit() {
    this.restoreDraft();
  }

  private restoreDraft() {
    const raw = this.localStorage.get(this.STORAGE_KEY);
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d.step) this.step.set(d.step);
      if (d.intent) this.intent.set(d.intent);
      if (d.name) this.name.set(d.name);
      if (d.age) this.age.set(d.age);
      if (d.gender) this.gender.set(d.gender);
      if (d.city) this.city.set(d.city);
      if (d.motherTongue) this.motherTongue.set(d.motherTongue);
      if (d.photos?.length) this.photos.set(d.photos);
      if (d.selectedTags?.length) this.selectedTags.set(d.selectedTags);
    } catch { /* ignore corrupt data */ }
  }

  readonly intentOptions = [
    { value: 'serious' as Intent, icon: '💍', label: 'Serious Relationship', desc: 'Looking for a long-term partner' },
    { value: 'marriage' as Intent, icon: '👨‍👩‍👧', label: 'Marriage', desc: 'Ready to settle down' },
    { value: 'casual' as Intent, icon: '😊', label: 'Casual Dating', desc: 'Go with the flow' },
  ];

  readonly genderOptions = [
    { value: 'female' as Gender, label: 'Woman' },
    { value: 'male' as Gender, label: 'Man' },
    { value: 'other' as Gender, label: 'Other' },
  ];

  readonly canProceed = computed(() => {
    switch (this.step()) {
      case 1: return !!this.intent();
      case 2: return this.name().trim().length > 1 && /^[^\d]+$/.test(this.name().trim()) && +this.age() >= 18 && !!this.gender();
      case 3: return this.city().trim().length > 1;
      case 4: return this.photos().length > 0;
      case 5: return true;
      default: return false;
    }
  });

  onNameChange(value: string) {
    this.name.set(value.replace(/\d/g, ''));
  }

  prevStep() { this.step.update(s => Math.max(1, s - 1)); }

  async nextStep() {
    this.error.set('');
    if (!this.canProceed()) return;
    if (this.step() < this.totalSteps) {
      this.step.update(s => s + 1);
      return;
    }
    await this.submit();
  }

  toggleTag(tag: string) {
    this.selectedTags.update(tags => {
      if (tags.includes(tag)) return tags.filter(t => t !== tag);
      if (tags.length >= 5) return tags;
      return [...tags, tag];
    });
  }

  async onPhotoSelect(event: Event, index: number) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.photoUploading.set(true);
    try {
      const result = await this.queryService.uploadImage(file);
      this.photos.update(p => {
        const arr = [...p];
        arr[index] = result.url;
        return arr.filter(Boolean);
      });
    } catch {
      this.error.set('Photo upload failed. Try again.');
    } finally {
      this.photoUploading.set(false);
    }
  }

  removePhoto(index: number) {
    this.photos.update(p => p.filter((_, i) => i !== index));
  }

  private async submit() {
    this.loading.set(true);
    try {
      const result = await this.queryService.onboardUser(
        this.name().trim(),
        [this.intent()],
        {
          age: +this.age(),
          gender: this.gender(),
          city: this.city().trim(),
          photos: this.photos(),
          tags: this.selectedTags(),
          motherTongue: this.motherTongue(),
        }
      );
      this.authService.setUser({ ...result.user, isOnboarded: true });
      this.localStorage.remove(this.STORAGE_KEY);
      this.notification.success('Welcome to Genzyy!');
      this.router.navigate(['/discover']);
    } catch (e: any) {
      this.error.set(e?.message || 'Something went wrong. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
