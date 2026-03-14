import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html'
})
export class ShellComponent {
  readonly tabs = [
    { path: '/discover',  icon: '🔥', label: 'Discover' },
    { path: '/liked-me',  icon: '💝', label: 'Likes' },
    { path: '/matches',   icon: '💬', label: 'Messages' },
    { path: '/clubs',     icon: '👥', label: 'Clubs' },
    { path: '/profile',   icon: '👤', label: 'Profile' },
  ];
}
