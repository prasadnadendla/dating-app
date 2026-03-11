import { Component, inject, signal, computed, OnInit, HostListener, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { QueryService } from '../query.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { DatingProfile, SwipeResult } from '../models/user.model';

const GET_DISCOVER = `
  query GetDiscoverProfiles($cursor: String) {
    discoverProfiles(cursor: $cursor) {
      profiles {
        id name age gender city photos voiceIntroUrl
        intent tags motherTongue religion community
        education profession isVerified compatibilityScore
        clubs { id name icon }
      }
      nextCursor
    }
  }
`;

const SWIPE_MUTATION = `
  mutation Swipe($targetId: ID!, $action: String!) {
    swipe(targetId: $targetId, action: $action) {
      isMatch
      matchId
    }
  }
`;

@Component({
  selector: 'app-discover',
  standalone: true,
  imports: [],
  templateUrl: './discover.component.html'
})
export class DiscoverComponent implements OnInit {
  private queryService = inject(QueryService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notification = inject(NotificationService);
  private platformId = inject(PLATFORM_ID);

  profiles = signal<DatingProfile[]>([]);
  currentIndex = signal(0);
  loading = signal(false);
  nextCursor = signal<string | null>(null);
  showMatchModal = signal(false);
  matchedProfile = signal<DatingProfile | null>(null);
  matchedMatchId = signal<string | null>(null);
  showFilters = signal(false);
  filterIntent = signal('');

  // Drag state
  dragX = signal(0);
  dragY = signal(0);
  isDragging = signal(false);
  private startX = 0;
  private startY = 0;
  private activePointerId = -1;

  readonly currentProfile = computed(() => this.profiles()[this.currentIndex()] ?? null);
  readonly nextProfile = computed(() => this.profiles()[this.currentIndex() + 1] ?? null);
  readonly thirdProfile = computed(() => this.profiles()[this.currentIndex() + 2] ?? null);

  readonly cardTransform = computed(() => {
    const x = this.dragX();
    const y = this.dragY() * 0.3;
    const rotation = x * 0.05;
    return `translateX(${x}px) translateY(${y}px) rotate(${rotation}deg)`;
  });

  ngOnInit() {
    this.loadProfiles();
  }

  private loadProfiles() {
    this.loading.set(true);
    this.queryService.watchQuery<{ discoverProfiles: { profiles: DatingProfile[]; nextCursor: string } }>(
      GET_DISCOVER,
      { cursor: this.nextCursor() }
    ).valueChanges.subscribe({
      next: ({ data }) => {
        const disc = data?.discoverProfiles;
        const profiles = (disc?.profiles as DatingProfile[]) ?? [];
        const cursor = (disc?.nextCursor as string) ?? null;
        this.profiles.update(p => [...p, ...profiles]);
        this.nextCursor.set(cursor);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onPointerDown(event: PointerEvent) {
    if (this.activePointerId !== -1) return;
    this.isDragging.set(true);
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.activePointerId = event.pointerId;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent) {
    if (!this.isDragging() || event.pointerId !== this.activePointerId) return;
    this.dragX.set(event.clientX - this.startX);
    this.dragY.set(event.clientY - this.startY);
  }

  onPointerUp(event: PointerEvent) {
    if (!this.isDragging() || event.pointerId !== this.activePointerId) return;
    this.isDragging.set(false);
    this.activePointerId = -1;
    const threshold = isPlatformBrowser(this.platformId) ? window.innerWidth * 0.3 : 120;
    if (this.dragX() > threshold) {
      this.triggerSwipe('like');
    } else if (this.dragX() < -threshold) {
      this.triggerSwipe('pass');
    } else {
      this.dragX.set(0);
      this.dragY.set(0);
    }
  }

  like() { this.triggerSwipe('like'); }
  pass() { this.triggerSwipe('pass'); }
  superLike() { this.triggerSwipe('super_like'); }

  private async triggerSwipe(action: 'like' | 'pass' | 'super_like') {
    const profile = this.currentProfile();
    if (!profile) return;

    const width = isPlatformBrowser(this.platformId) ? window.innerWidth : 400;
    const direction = action === 'pass' ? -1 : 1;
    this.dragX.set(direction * (width + 100));

    try {
      const result = await this.queryService.mutate<{ swipe: SwipeResult }>(
        SWIPE_MUTATION,
        { targetId: profile.id, action }
      ).toPromise();

      if (result?.data?.swipe?.isMatch) {
        this.matchedProfile.set(profile);
        this.matchedMatchId.set(result.data.swipe.matchId ?? null);
        setTimeout(() => this.showMatchModal.set(true), 350);
      }
    } catch {
      // Silently fail swipe — still advance card
    }

    setTimeout(() => {
      this.currentIndex.update(i => i + 1);
      this.dragX.set(0);
      this.dragY.set(0);

      const remaining = this.profiles().length - this.currentIndex();
      if (remaining < 3 && this.nextCursor()) {
        this.loadProfiles();
      }
    }, 300);
  }

  playVoiceIntro(profile: DatingProfile) {
    if (!isPlatformBrowser(this.platformId) || !profile.voiceIntroUrl) return;
    new Audio(profile.voiceIntroUrl).play();
  }

  dismissMatch() {
    this.showMatchModal.set(false);
    this.matchedProfile.set(null);
  }

  openChat() {
    const matchId = this.matchedMatchId();
    this.dismissMatch();
    if (matchId) this.router.navigate(['/chat', matchId]);
  }

  applyFilters() {
    this.profiles.set([]);
    this.currentIndex.set(0);
    this.nextCursor.set(null);
    this.showFilters.set(false);
    this.loadProfiles();
  }
}
