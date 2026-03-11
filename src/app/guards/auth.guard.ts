import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true; // skip on SSR, let browser handle

  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  router.navigate(['/login']);
  return false;
};

export const guestGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true;

  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) {
    router.navigate([auth.isOnboarded() ? '/discover' : '/onboarding']);
    return false;
  }
  return true;
};

export const onboardedGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true; // skip on SSR

  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }
  if (!auth.isOnboarded()) {
    router.navigate(['/onboarding']);
    return false;
  }
  return true;
};
