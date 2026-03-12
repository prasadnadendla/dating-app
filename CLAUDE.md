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

## GraphQL — Hasura Syntax

All GraphQL queries and mutations MUST use **Hasura auto-generated syntax**, not custom resolver names.

### Query patterns
```graphql
# Fetch by primary key
query GetUser($id: uuid!) {
  da_users_by_pk(id: $id) {
    id name age gender city ...
  }
}

# Fetch list with filters
query ListUsers($where: da_users_bool_exp!) {
  da_users(where: $where) {
    id name ...
  }
}
```

### Mutation patterns
```graphql
# Update by primary key
mutation UpdateUser($id: uuid!, $set: da_users_set_input!) {
  update_da_users_by_pk(pk_columns: {id: $id}, _set: $set) {
    id name ...
  }
}

# Insert one
mutation InsertUser($object: da_users_insert_input!) {
  insert_da_users_one(object: $object) {
    id
  }
}

# Delete by primary key
mutation DeleteUser($id: uuid!) {
  delete_da_users_by_pk(id: $id) {
    id
  }
}
```

### Rules
- Field names in queries are **snake_case** (matching DB columns): `mother_tongue`, `voice_intro_url`, `is_verified`, `spark_pass_expiry`
- Frontend models use **camelCase** — always map snake_case ↔ camelCase at the query boundary
- Table prefix is `da_` (e.g., `da_users`, `da_tokens`)
- Use `_by_pk` for single-row operations, `_where` for filtered lists
- Variables use `$` prefix with Hasura input types: `da_users_set_input!`, `da_users_bool_exp!`, `da_users_insert_input!`

## Angular 21 — Prefer Latest Features

- **Signals everywhere** — use `signal()`, `computed()`, `effect()`, `linkedSignal()` for state; avoid `BehaviorSubject`
- **`@let` syntax** — use `@let` in templates for computed values instead of extra component properties
- **Control flow** — use `@if`, `@for`, `@switch`, `@defer` (NOT `*ngIf`, `*ngFor`, `ngSwitch`)
- **Resource API** — prefer `resource()` / `rxResource()` for async data fetching where applicable
- **Incremental hydration** — use `@defer (hydrate on ...)` for SSR hydration triggers
- **Zoneless** — never import Zone.js; rely on signals and `markForCheck()` for change detection
- **Input signals** — use `input()` / `input.required()` instead of `@Input()` decorator
- **Output signals** — use `output()` instead of `@Output()` decorator
- **Model signals** — use `model()` for two-way binding instead of `@Input()` + `@Output()` combo
- **View queries** — use `viewChild()` / `viewChildren()` / `contentChild()` instead of `@ViewChild()` decorator

## UI/UX — Design System

### Theme
- **Glassmorphism** — use `backdrop-blur-xl bg-white/10 border border-white/20` for card surfaces
- **Dark mode first** — primary background `bg-[#0f0f23]` or `bg-gradient-to-b from-[#0f0f23] to-[#1a1a3e]`
- **Glowing accents** — use `shadow-[0_0_20px_rgba(227,40,240,0.3)]` for primary glow, `shadow-[0_0_20px_rgba(240,90,40,0.3)]` for spark glow
- **Brand gradient** — `bg-gradient-to-r from-[#F05A28] to-[#e328f0]` for CTAs and highlights

### Buttons
- **Fluid buttons** — use `transition-all duration-300 ease-out` with `hover:scale-105 active:scale-95`
- **Gradient CTAs** — `bg-gradient-to-r from-[#F05A28] to-[#e328f0] hover:shadow-[0_0_25px_rgba(227,40,240,0.4)]`
- **Ghost buttons** — `border border-white/20 bg-white/5 hover:bg-white/10 backdrop-blur`
- **Pill shape** — `rounded-full px-6 py-3` for primary actions

### Animations
- **Page transitions** — fade-in with slide: `animate-[fadeSlideUp_0.4s_ease-out]`
- **Card entrance** — staggered: `@for (item of items; track item.id; let i = $index) { <div [style.animation-delay]="i * 0.1 + 's'"> }`
- **Micro-interactions** — `transition-all duration-200` on interactive elements
- **Skeleton loaders** — `animate-pulse bg-white/10 rounded` for loading states
- **Swipe feedback** — spring physics on drag gestures with `will-change-transform`
- Use `@keyframes` in component SCSS or global styles; prefer Tailwind's `animate-` utilities when possible
- Keep animations under 400ms for responsiveness; use `prefers-reduced-motion` media query for accessibility
