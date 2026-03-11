Add a new GraphQL query or mutation to a component.

Arguments: $ARGUMENTS (query/mutation name and which component to add it to)

Requirements:
- Define the query/mutation as a `const` string at the top of the component file
- Use `queryService.query<T>()`, `queryService.watchQuery<T>()`, or `queryService.mutate<T>()` from the existing `QueryService`
- Cast Apollo `DeepPartialObject` responses with `as Type` at the subscription boundary to avoid strict type errors
- Use signals to store the query results
- Handle loading and error states in the template
- If the query needs new model types, add them to the appropriate file in `src/app/models/`
- Build with `npx ng build` to verify no type errors
