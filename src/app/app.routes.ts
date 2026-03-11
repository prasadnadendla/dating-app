import { Routes } from '@angular/router';
import { authGuard, onboardedGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'onboarding',
    loadComponent: () => import('./onboarding/onboarding.component').then(m => m.OnboardingComponent),
    canActivate: [authGuard]
  },
  {
    path: 'chat/:matchId',
    loadComponent: () => import('./chat/chat-room/chat-room.component').then(m => m.ChatRoomComponent),
    canActivate: [authGuard, onboardedGuard]
  },
  {
    path: '',
    loadComponent: () => import('./shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard, onboardedGuard],
    children: [
      { path: '', redirectTo: 'discover', pathMatch: 'full' },
      {
        path: 'discover',
        loadComponent: () => import('./discover/discover.component').then(m => m.DiscoverComponent)
      },
      {
        path: 'matches',
        loadComponent: () => import('./matches/matches.component').then(m => m.MatchesComponent)
      },
      {
        path: 'clubs',
        loadComponent: () => import('./clubs/clubs.component').then(m => m.ClubsComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'upgrade',
        loadComponent: () => import('./upgrade/upgrade.component').then(m => m.UpgradeComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
