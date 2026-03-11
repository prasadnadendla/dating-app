Add a new REST API method to QueryService.

Arguments: $ARGUMENTS (method name, HTTP method, endpoint, and description)

Requirements:
- Add the method to `src/app/query.service.ts`
- Use `fetch()` with `this.getURL(path)` for the URL
- Include `Authorization: Bearer ${this.localStorageService.get('token')}` header for authenticated endpoints
- Include proper `Content-Type` header
- Handle error responses with meaningful error messages
- Return typed response
- Follow the existing patterns in QueryService (see `sendOTP`, `verifyOTP`, `onboardUser` for reference)
