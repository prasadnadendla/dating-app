Run `npx ng build` and analyze the output.

- If there are TypeScript or template compilation errors, fix them one by one and rebuild
- Report the final bundle sizes (initial + lazy chunks)
- Warn if initial bundle exceeds 500 kB budget
- Confirm SSR prerendering completed successfully
