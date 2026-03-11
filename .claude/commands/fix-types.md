Run `npx ng build` and fix all TypeScript compilation errors.

Common issues in this codebase:
- Apollo `DeepPartialObject<T>` not assignable to `T` → cast with `as T` at subscription boundary
- `undefined` not assignable → use nullish coalescing (`?? []`, `?? null`)
- Angular template parser errors → check template syntax, avoid semicolons in template expressions
- Missing imports → add to the component's `imports` array

Fix each error, rebuild, and repeat until the build succeeds with zero errors.
Report any remaining warnings.
