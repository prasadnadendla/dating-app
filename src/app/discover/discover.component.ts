import { Component, inject, signal, computed, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { QueryService } from '../query.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { DatingProfile } from '../models/user.model';
import { ImageUrlPipe } from '../elements/image-url.pipe';

const GET_DISCOVER = `
  query GetDiscoverProfiles($where: da_users_bool_exp!, $limit: Int!, $offset: Int!) {
    da_users(where: $where, limit: $limit, offset: $offset, order_by: {created_at: desc}) {
      id name age gender city photos voice_intro_url
      intent tags mother_tongue religion community
      education profession is_verified
    }
  }
`;

const SWIPE_MUTATION = `
  mutation Swipe($object: da_swipes_insert_input!) {
    insert_da_swipes_one(object: $object) {
      id
    }
  }
`;

const CHECK_MATCH = `
  query CheckMatch($where: da_swipes_bool_exp!) {
    da_swipes(where: $where) {
      id
    }
  }
`;

const CREATE_MATCH = `
  mutation CreateMatch($object: da_matches_insert_input!) {
    insert_da_matches_one(object: $object) {
      id
    }
  }
`;

const GET_MY_MATCHES = `
  query GetMyMatches($where: da_matches_bool_exp!) {
    da_matches(where: $where) {
      id user1_id user2_id
    }
  }
`;

@Component({
  selector: 'app-discover',
  standalone: true,
  imports: [ImageUrlPipe],
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
  offset = signal(0);
  private readonly PAGE_SIZE = 10;
  showMatchModal = signal(false);
  matchedProfile = signal<DatingProfile | null>(null);
  matchedMatchId = signal<string | null>(null);
  showFilters = signal(false);
  filterIntent = signal('');
  // Map of userId → matchId for already matched profiles
  matchedUserIds = signal<Map<string, string>>(new Map());

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

  readonly currentMatchId = computed(() => {
    const profile = this.currentProfile();
    return profile ? this.matchedUserIds().get(profile.id) ?? null : null;
  });

  readonly cardTransform = computed(() => {
    const x = this.dragX();
    const y = this.dragY() * 0.3;
    const rotation = x * 0.05;
    return `translateX(${x}px) translateY(${y}px) rotate(${rotation}deg)`;
  });

  ngOnInit() {
    this.loadMatches();
    this.loadProfiles();
  }

  private loadMatches() {
    const userId = this.authService.userId();
    this.queryService.query<{ da_matches: { id: string; user1_id: string; user2_id: string }[] }>(
      GET_MY_MATCHES,
      { where: { _or: [{ user1_id: { _eq: userId } }, { user2_id: { _eq: userId } }], is_active: { _eq: true } } }
    ).subscribe({
      next: ({ data }) => {
        const map = new Map<string, string>();
        for (const m of data?.da_matches ?? []) {
          const otherId = m.user1_id === userId ? m.user2_id : m.user1_id;
          map.set(otherId, m.id);
        }
        this.matchedUserIds.set(map);
      }
    });
  }

  private mapProfile(row: any): DatingProfile {
    return {
      id: row.id, name: row.name, age: row.age, gender: row.gender,
      city: row.city, photos: row.photos ?? [], intent: row.intent,
      tags: row.tags ?? [], voiceIntroUrl: row.voice_intro_url,
      motherTongue: row.mother_tongue, religion: row.religion,
      community: row.community, education: row.education,
      profession: row.profession, isVerified: row.is_verified,
    };
  }

  private loadProfiles() {
    this.loading.set(true);
    const userId = this.authService.userId();
    const where: any = {
      id: { _neq: userId },
      is_onboarded: { _eq: true },
      is_deleted: { _eq: false },
      blocked: { _eq: false },
    };
    if (this.filterIntent()) {
      where.intent = { _eq: this.filterIntent() };
    }
    this.queryService.watchQuery<{ da_users: any[] }>(
      GET_DISCOVER,
      { where, limit: this.PAGE_SIZE, offset: this.offset() }
    ).valueChanges.subscribe({
      next: ({ data }) => {
        const rows = data?.da_users ?? [];
        const profiles = rows.map((r: any) => this.mapProfile(r));
        this.profiles.update(p => [...p, ...profiles]);
        this.offset.update(o => o + rows.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onPointerDown(event: PointerEvent) {
    if (this.activePointerId !== -1 || this.currentMatchId()) return;
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

    const userId = this.authService.userId();
    const width = isPlatformBrowser(this.platformId) ? window.innerWidth : 400;
    const direction = action === 'pass' ? -1 : 1;
    this.dragX.set(direction * (width + 100));

    try {
      await this.queryService.mutate(
        SWIPE_MUTATION,
        { object: { user_id: userId, target_id: profile.id, action } }
      ).toPromise();

      // Check if the other user already liked us → it's a match
      if (action === 'like' || action === 'super_like') {
        const check = await this.queryService.query<{ da_swipes: { id: string }[] }>(
          CHECK_MATCH,
          { where:
          {user_id: {_eq: userId}, target_id: {_eq: profile.id}, action: {_in: ["like", "super_like"]}} }
        ).toPromise();

        if (check?.data?.da_swipes?.length) {
          // Create mutual match — server autofills user1_id from JWT
          const match = await this.queryService.mutate<{ insert_da_matches_one: { id: string } }>(
            CREATE_MATCH,
            { object: { user2_id: profile.id } }
          ).toPromise();

          const matchId = match?.data?.insert_da_matches_one?.id ?? null;
          if (matchId) {
            this.matchedUserIds.update(m => new Map(m).set(profile.id, matchId));
          }
          this.matchedProfile.set(profile);
          this.matchedMatchId.set(matchId);
          setTimeout(() => this.showMatchModal.set(true), 350);
        }
      }
    } catch {
      // Silently fail swipe — still advance card
    }

    setTimeout(() => {
      this.currentIndex.update(i => i + 1);
      this.dragX.set(0);
      this.dragY.set(0);

      const remaining = this.profiles().length - this.currentIndex();
      if (remaining < 3) {
        this.loadProfiles();
      }
    }, 300);
  }

  playVoiceIntro(profile: DatingProfile) {
    if (!isPlatformBrowser(this.platformId) || !profile.voiceIntroUrl) return;
    new Audio(profile.voiceIntroUrl).play();
  }

  chatWithMatch() {
    const matchId = this.currentMatchId();
    if (matchId) this.router.navigate(['/chat', matchId]);
  }

  skipProfile() {
    this.currentIndex.update(i => i + 1);
    const remaining = this.profiles().length - this.currentIndex();
    if (remaining < 3) this.loadProfiles();
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
    this.offset.set(0);
    this.showFilters.set(false);
    this.loadProfiles();
  }
}
