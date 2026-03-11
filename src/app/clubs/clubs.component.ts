import { Component, inject, signal, OnInit } from '@angular/core';
import { QueryService } from '../query.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { Club } from '../models/club.model';

const GET_CLUBS = `
  query GetClubs {
    clubs { id name icon memberCount description isJoined }
  }
`;

const JOIN_CLUB = `
  mutation JoinClub($clubId: ID!) {
    joinClub(clubId: $clubId) { id isJoined }
  }
`;

const LEAVE_CLUB = `
  mutation LeaveClub($clubId: ID!) {
    leaveClub(clubId: $clubId) { id isJoined }
  }
`;

@Component({
  selector: 'app-clubs',
  standalone: true,
  imports: [],
  templateUrl: './clubs.component.html'
})
export class ClubsComponent implements OnInit {
  private queryService = inject(QueryService);
  private notification = inject(NotificationService);

  clubs = signal<Club[]>([]);
  loading = signal(true);
  readonly joinedCount = signal(0);

  ngOnInit() {
    this.queryService.watchQuery<{ clubs: Club[] }>(GET_CLUBS)
      .valueChanges.subscribe({
        next: ({ data }) => {
          const list = (data?.clubs as Club[]) ?? [];
          this.clubs.set(list);
          this.joinedCount.set(list.filter(c => c.isJoined).length);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  async joinClub(club: Club) {
    if (this.joinedCount() >= 3) {
      this.notification.info('You can join up to 3 clubs. Leave one first.');
      return;
    }
    this.clubs.update(list => list.map(c => c.id === club.id ? { ...c, isJoined: true } : c));
    this.joinedCount.update(n => n + 1);
    try {
      await this.queryService.mutate(JOIN_CLUB, { clubId: club.id }).toPromise();
      this.notification.success(`Joined ${club.name}!`);
    } catch {
      this.clubs.update(list => list.map(c => c.id === club.id ? { ...c, isJoined: false } : c));
      this.joinedCount.update(n => n - 1);
      this.notification.error('Failed to join club');
    }
  }

  async leaveClub(club: Club) {
    this.clubs.update(list => list.map(c => c.id === club.id ? { ...c, isJoined: false } : c));
    this.joinedCount.update(n => n - 1);
    try {
      await this.queryService.mutate(LEAVE_CLUB, { clubId: club.id }).toPromise();
    } catch {
      this.clubs.update(list => list.map(c => c.id === club.id ? { ...c, isJoined: true } : c));
      this.joinedCount.update(n => n + 1);
      this.notification.error('Failed to leave club');
    }
  }

  formatCount(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  }
}
