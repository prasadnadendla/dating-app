# Genzyy — dating-app

Indian dating app with swipe-based discovery, community clubs, voice intros, and women-first safety features. Supports OTP login, Aadhaar verification, and micro-transaction monetisation via Razorpay.

## Commands

```bash
npm start                          # dev server (localhost:4400)
npm run build                      # production build
npm run watch                      # dev build with file watching
npm test                           # run karma unit tests
npm run serve:ssr:datingapp        # serve SSR build locally (port 4000)
```

## Architecture

- **Angular 21** — standalone components, lazy-loaded routes, no NgModules
- **Zoneless change detection** — `provideZonelessChangeDetection()` — do NOT add Zone.js triggers; use signals or `markForCheck()` instead
- **SSR** — Express server at `src/server.ts`, output mode `server`; incremental hydration enabled
- **GraphQL** — Apollo Client via `QueryService`; Bearer token auth from localStorage
- **Service Worker** — Angular's ngsw via `ngsw-config.json`; prefetch for app shell, lazy for assets

## Project Structure

```
src/
├── app/
│   ├── auth/login/             # OTP login (phone → OTP flow)
│   ├── onboarding/             # 5-step onboarding wizard
│   ├── discover/               # Swipe card discovery with drag gestures
│   ├── matches/                # Match list + "who liked you" (premium-gated)
│   ├── chat/chat-room/         # Text + voice messages, icebreakers, report/block
│   ├── profile/                # View/edit profile, photo gallery, voice intro
│   ├── clubs/                  # Community clubs (join up to 3)
│   ├── upgrade/                # Spark Pass + micro-transactions (Razorpay)
│   ├── shell/                  # App shell with bottom navigation
│   ├── models/                 # Domain models (user, match, message, club)
│   ├── services/               # auth.service, notification.service
│   ├── guards/                 # authGuard, onboardedGuard
│   ├── query.service.ts        # Apollo GraphQL + REST API client
│   ├── local-storage.service.ts # SSR-safe localStorage wrapper
│   ├── app.routes.ts           # all routes (lazy-loaded)
│   └── app.config.ts           # providers, zoneless, hydration, Apollo
├── models/                     # (legacy) profile.model.ts
├── environments/               # environment.ts (prod) / environment.dev.ts
├── server.ts                   # SSR Express entry
└── styles.scss                 # Global styles + Tailwind CSS 4
public/
├── manifest.webmanifest        # PWA manifest (Genzyy branding)
├── icons/                      # App icons (72–512px) + logo.webp
└── screenshots/                # PWA install screenshots
```

## Key Services

| Service | Purpose |
|---|---|
| `QueryService` | Apollo GraphQL (`query`, `watchQuery`, `mutate`) + REST (`sendOTP`, `verifyOTP`, `onboardUser`, `uploadImage`) |
| `AuthService` | Signal-based auth state (`token`, `currentUser`, `isAuthenticated`, `isOnboarded`, `isPremium`) |
| `NotificationService` | Toast notifications (success/error/info) |
| `LocalStorageService` | SSR-safe typed localStorage wrapper |

## Routing

- Routes in `app.routes.ts` — all lazy-loaded standalone components
- `authGuard` — requires authenticated user (token in localStorage)
- `onboardedGuard` — requires completed onboarding (`isOnboarded: true`)
- Auth routes (`/login`, `/onboarding`) are outside the shell
- Main app routes (`/discover`, `/matches`, `/clubs`, `/profile`, `/upgrade`) are shell children
- Chat (`/chat/:matchId`) is full-screen (no bottom nav)
- Wildcard `**` redirects to `''` → `discover`

## Environments

| Key | Production | Development |
|---|---|---|
| `apiBaseURL` | `https://genzyy-api-...asia-south1.run.app` | `http://localhost:3003` |
| `graphCacheDB` | `graph-cache-v1` | `graph-cache-dev` |

## Styling

- **Tailwind CSS 4** with `@tailwindcss/postcss`
- Global styles in `src/styles.scss`
- CSS variables: `--color-primary: #e328f0`, `--color-spark: #F05A28`, `--color-dark: #1A2744`
- Component styles use SCSS; keep under 4kB per component (budget warning at 4kB, error at 8kB)
- Brand gradient: `from-[#F05A28] to-[#e328f0]`

## Safety Features

- **Women message first** — men cannot send the first message in chat
- **Blurred photos** — "who liked you" photos are blurred unless premium
- **Report/Block** — one-tap report with reason selection in chat
- **Share my date** — live location sharing to trusted contact (planned)

## Bundle Budgets

| Type | Warning | Error |
|---|---|---|
| Initial bundle | 500 kB | 1 MB |
| Component styles | 4 kB | 8 kB |

## Code Conventions

- Use `inject()` for dependency injection, not constructor parameters
- Prefer Angular signals over RxJS for local component state
- All new components must be standalone
- No new NgModules
- Use separate `.html` template files (not inline `template:`)
- Strict TypeScript — `strict: true`, `noImplicitReturns: true`; avoid `any`
- Cast Apollo `DeepPartialObject` responses with `as Type` at the subscription boundary
- Do not add `console.log` to production code
- SSR-safe: guard `localStorage`, `window`, `navigator` with `isPlatformBrowser()` checks
