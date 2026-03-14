import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { QueryService } from '../query.service';
import { AuthService } from '../services/auth.service';
import { Match } from '../models/match.model';
import { ImageUrlPipe } from '../elements/image-url.pipe';

const GET_MATCHES = `
  query GetMatches($where: da_matches_bool_exp!) {
    da_matches(where: $where, order_by: {created_at: desc}) {
      id created_at is_active
      user1 { id name age photos is_verified city }
      user2 { id name age photos is_verified city }
    }
  }
`;

interface HasuraMatch {
  id: string;
  created_at: number;
  is_active: boolean;
  user1: { id: string; name: string; age: number; photos: string[]; is_verified: boolean; city: string };
  user2: { id: string; name: string; age: number; photos: string[]; is_verified: boolean; city: string };
}

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [ImageUrlPipe],
  templateUrl: './matches.component.html'
})
export class MatchesComponent implements OnInit {
  private queryService = inject(QueryService);
  private authService = inject(AuthService);
  readonly router = inject(Router);

  matches = signal<Match[]>([]);
  loading = signal(true);

  ngOnInit() {
    const userId = this.authService.userId();

    this.queryService.watchQuery<{ da_matches: HasuraMatch[] }>(
      GET_MATCHES,
      { where: { _or: [{ user1_id: { _eq: userId } }, { user2_id: { _eq: userId } }], is_active: { _eq: true } } }
    ).valueChanges.subscribe({
      next: ({ data }) => {
        this.matches.set((data?.da_matches as HasuraMatch[] ?? []).map(m => this.mapMatch(m, userId!)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private mapMatch(row: HasuraMatch, userId: string): Match {
    const other = row.user1.id === userId ? row.user2 : row.user1;
    return {
      id: row.id,
      matchedAt: new Date(row.created_at * 1000).toISOString(),
      unreadCount: 0,
      profile: {
        id: other.id,
        name: other.name,
        age: other.age,
        photos: other.photos ?? [],
        isVerified: other.is_verified,
        city: other.city,
        gender: 'other',
        intent: 'serious',
        tags: [],
      },
    };
  }

  openChat(match: Match) {
    this.router.navigate(['/chat', match.id]);
  }

  timeAgo(epochOrIso: string): string {
    const date = epochOrIso.includes('T') ? new Date(epochOrIso) : new Date(epochOrIso);
    const diff = Date.now() - date.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }
}
