import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { QueryService } from '../query.service';
import { AuthService } from '../services/auth.service';
import { DatingProfile } from '../models/user.model';
import { ImageUrlPipe } from '../elements/image-url.pipe';

const GET_WHO_LIKED_ME = `
  query GetWhoLikedMe($where: da_swipes_bool_exp!) {
    da_swipes(where: $where, order_by: {created_at: desc}) {
      id
      user { id name age photos is_verified city }
    }
  }
`;

const GET_MY_MATCHES = `
  query GetMyMatchIds($where: da_matches_bool_exp!) {
    da_matches(where: $where) {
      user1_id user2_id
    }
  }
`;

interface HasuraSwipe {
  id: string;
  user: { id: string; name: string; age: number; photos: string[]; is_verified: boolean; city: string };
}

@Component({
  selector: 'app-liked-me',
  standalone: true,
  imports: [ImageUrlPipe],
  templateUrl: './liked-me.component.html'
})
export class LikedMeComponent implements OnInit {
  private queryService = inject(QueryService);
  private authService = inject(AuthService);
  readonly router = inject(Router);

  profiles = signal<DatingProfile[]>([]);
  loading = signal(true);

  readonly isPremium = this.authService.isPremium;

  ngOnInit() {
    const userId = this.authService.userId();

    // Load matches first to filter them out
    this.queryService.query<{ da_matches: { user1_id: string; user2_id: string }[] }>(
      GET_MY_MATCHES,
      { where: { _or: [{ user1_id: { _eq: userId } }, { user2_id: { _eq: userId } }], is_active: { _eq: true } } }
    ).subscribe({
      next: ({ data }) => {
        const matchedIds = new Set<string>();
        for (const m of data?.da_matches ?? []) {
          matchedIds.add(m.user1_id === userId ? m.user2_id : m.user1_id);
        }
        this.loadLikes(userId!, matchedIds);
      },
      error: () => this.loading.set(false)
    });
  }

  private loadLikes(userId: string, matchedIds: Set<string>) {
    this.queryService.watchQuery<{ da_swipes: HasuraSwipe[] }>(
      GET_WHO_LIKED_ME,
      { where: { target_id: { _eq: userId }, action: { _in: ['like', 'super_like'] } } }
    ).valueChanges.subscribe({
      next: ({ data }) => {
        const all = (data?.da_swipes as HasuraSwipe[] ?? []).map(s => this.mapProfile(s));
        this.profiles.set(all.filter(p => !matchedIds.has(p.id)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private mapProfile(row: HasuraSwipe): DatingProfile {
    return {
      id: row.user.id,
      name: row.user.name,
      age: row.user.age,
      photos: row.user.photos ?? [],
      isVerified: row.user.is_verified,
      city: row.user.city ?? '',
      gender: 'other',
      intent: 'serious',
      tags: [],
    };
  }
}
