import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { LocalStorageService } from '../local-storage.service';
import { DatingProfile } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private localStorage = inject(LocalStorageService);
  private router = inject(Router);

  readonly token = signal<string | null>(this.localStorage.get('token'));
  readonly currentUser = signal<DatingProfile | null>(this.getStoredUser());

  readonly isAuthenticated = computed(() => !!this.token());
  readonly isOnboarded = computed(() => !!this.currentUser()?.isOnboarded);
  readonly isPremium = computed(() => !!this.currentUser()?.isPremium);
  readonly userId = computed(() => this.currentUser()?.id ?? null);

  private getStoredUser(): DatingProfile | null {
    const stored = this.localStorage.get('user');
    if (stored) {
      try { return JSON.parse(stored); } catch { return null; }
    }
    return null;
  }

  login(token: string, user: DatingProfile): void {
    this.localStorage.set('token', token);
    this.localStorage.set('user', JSON.stringify(user));
    this.token.set(token);
    this.currentUser.set(user);
  }

  setUser(user: DatingProfile): void {
    this.localStorage.set('user', JSON.stringify(user));
    this.currentUser.set(user);
  }

  logout(): void {
    this.localStorage.remove('token');
    this.localStorage.remove('user');
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
