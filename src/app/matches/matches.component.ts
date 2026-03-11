import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { QueryService } from '../query.service';
import { AuthService } from '../services/auth.service';
import { Match } from '../models/match.model';
import { DatingProfile } from '../models/user.model';

const GET_MATCHES = `
  query GetMatches {
    matches {
      id matchedAt unreadCount
      profile { id name age photos isVerified }
      lastMessage { content type createdAt senderId }
    }
  }
`;

const GET_WHO_LIKED_ME = `
  query GetWhoLikedMe {
    whoLikedMe { id photos name age }
  }
`;

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [],
  templateUrl: './matches.component.html'
})
export class MatchesComponent implements OnInit {
  private queryService = inject(QueryService);
  private authService = inject(AuthService);
  readonly router = inject(Router);

  matches = signal<Match[]>([]);
  whoLikedMe = signal<DatingProfile[]>([]);
  loading = signal(true);

  readonly isPremium = this.authService.isPremium;

  ngOnInit() {
    this.queryService.watchQuery<{ matches: Match[] }>(GET_MATCHES)
      .valueChanges.subscribe({
        next: ({ data }) => {
          this.matches.set((data?.matches as Match[]) ?? []);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });

    this.queryService.query<{ whoLikedMe: DatingProfile[] }>(GET_WHO_LIKED_ME)
      ?.subscribe({
        next: ({ data }) => this.whoLikedMe.set((data?.whoLikedMe as DatingProfile[]) ?? [])
      });
  }

  openChat(match: Match) {
    this.router.navigate(['/chat', match.id]);
  }

  timeAgo(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }
}
