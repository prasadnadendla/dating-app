Add a new GraphQL query or mutation to a component.

Arguments: $ARGUMENTS (query/mutation name and which component to add it to)

Requirements:
- Define the query/mutation as a `const` string at the top of the component file
- **Use Hasura auto-generated syntax** — NOT custom resolver names
  - Queries: `da_<table>_by_pk(id: $id)` or `da_<table>(where: $where)`
  - Mutations: `update_da_<table>_by_pk(pk_columns: {id: $id}, _set: $set)`, `insert_da_<table>_one(object: $object)`, `delete_da_<table>_by_pk(id: $id)`
- **Field names in queries must be snake_case** (matching DB columns): `mother_tongue`, `voice_intro_url`, `is_verified`
- **Map snake_case → camelCase** at the query boundary using a mapper function
- Use `queryService.query<T>()`, `queryService.watchQuery<T>()`, or `queryService.mutate<T>()` from the existing `QueryService`
- Cast Apollo `DeepPartialObject` responses with `as Type` at the subscription boundary
- Use signals to store the query results
- Handle loading and error states in the template with skeleton loaders (`animate-pulse bg-white/10 rounded`)
- If the query needs new model types, add them to the appropriate file in `src/app/models/`
- Build with `npx ng build` to verify no type errors
