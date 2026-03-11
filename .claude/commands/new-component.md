Create a new Angular standalone component for this dating app.

Arguments: $ARGUMENTS (component name and description)

Requirements:
- Create the component in `src/app/<name>/` directory
- Use a **separate .html template file** (not inline template)
- Use `inject()` for dependency injection
- Use Angular signals for local state (not RxJS subjects)
- Use Tailwind CSS 4 utility classes for styling
- Follow brand colors: primary `#e328f0`, spark `#F05A28`, dark `#1A2744`
- Use brand gradient: `from-[#F05A28] to-[#e328f0]`
- Ensure SSR safety: guard browser APIs with `isPlatformBrowser()` checks
- Add the route to `app.routes.ts` with lazy loading
- Keep component styles under 4kB
- Build with `npx ng build` to verify no errors
