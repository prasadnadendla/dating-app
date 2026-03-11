import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { LocalStorageService } from '../local-storage.service';
import { DatingProfile } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private localStorage = inject(LocalStorageService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  readonly token = signal<string | null>(this.localStorage.get('token'));
  readonly currentUser = signal<DatingProfile | null>(this.getStoredUser());

  readonly isAuthenticated = computed(() => !!this.token());
  readonly isOnboarded = computed(() => !!this.currentUser()?.isOnboarded);
  readonly isPremium = computed(() => !!this.currentUser()?.isPremium);
  readonly userId = computed(() => this.currentUser()?.id ?? null);

  constructor() {
    // On the browser, re-hydrate from localStorage in case SSR initialized signals to null
    if (isPlatformBrowser(this.platformId)) {
      const storedToken = localStorage.getItem('token');
      if (storedToken && !this.token()) {
        this.token.set(storedToken);
      }
      const storedUser = localStorage.getItem('user');
      if (storedUser && !this.currentUser()) {
        try { this.currentUser.set(JSON.parse(storedUser)); } catch { /* ignore */ }
      }
    }
  }

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
