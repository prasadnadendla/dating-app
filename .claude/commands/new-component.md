Create a new Angular standalone component for this dating app.

Arguments: $ARGUMENTS (component name and description)

Requirements:
- Create the component in `src/app/<name>/` directory
- Use a **separate .html template file** (not inline template)
- Use `inject()` for dependency injection
- Use Angular 21 signal APIs for state: `signal()`, `computed()`, `input()`, `output()`, `model()`, `viewChild()`
- Use `@if`, `@for`, `@switch`, `@defer` control flow — NOT structural directives (`*ngIf`, `*ngFor`)
- Use `@let` in templates for computed values
- Use `resource()` or `rxResource()` for async data fetching where applicable
- Tailwind CSS 4 utility classes for styling
- **Glassmorphism surfaces**: `backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl`
- **Dark theme**: background `bg-[#0f0f23]`, cards with glass effect
- **Brand gradient CTAs**: `bg-gradient-to-r from-[#F05A28] to-[#e328f0] hover:shadow-[0_0_25px_rgba(227,40,240,0.4)]`
- **Fluid buttons**: `transition-all duration-300 ease-out hover:scale-105 active:scale-95 rounded-full`
- **Entrance animations**: fade-in slide-up with staggered delays for lists
- **Skeleton loaders**: `animate-pulse bg-white/10 rounded` for loading states
- Ensure SSR safety: guard browser APIs with `isPlatformBrowser()` checks
- Add the route to `app.routes.ts` with lazy loading
- Keep component styles under 4kB
- Respect `prefers-reduced-motion` for animations
- Build with `npx ng build` to verify no errors
