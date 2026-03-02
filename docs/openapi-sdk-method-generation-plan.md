# OpenAPI SDK Method Generation Plan

## Goal

Replace hand-written REST method internals in `src/api/*.ts` with generated methods sourced from `openapi.json`, while keeping the manual SDK layer (`SpongeWallet`, auth, credentials, MCP config) as the stable client-side abstraction.

## Scope

- Generate SDK API method layer from OpenAPI.
- Keep SDK-side behavior/config hand-written.
- Add compatibility tests to avoid public SDK regressions.

## Spike Status (this branch)

- Added `openapi-ts.config.ts` and switched API generation to `@hey-api/openapi-ts`.
- Generated SDK layer under `src/api/generated/heyapi` using:
  - `@hey-api/sdk` (operation functions)
  - `zod` plugin (generated request/response schemas)
  - `@hey-api/client-fetch` runtime
- Wired generated methods into:
  - `src/api/agents.ts`
  - `src/api/wallets.ts`
  - `src/api/transactions.ts`
  - `src/api/public-tools.ts`
- Added a thin `HttpClient` adapter (`src/api/generated/heyapi-adapter.ts`) so existing SDK classes can consume generated methods without changing public SDK interfaces.
- Preserved manual behavior for endpoints not represented in OpenAPI (for example `POST /api/sponge`).
- Added compatibility tests for route/payload behavior:
  - `tests/agents-api-compatibility.test.ts`
  - `tests/wallets-api-compatibility.test.ts`
  - `tests/generated-api-methods.test.ts`

## Proposed Full Migration

1. Expand generated operation coverage to all API classes in `src/api`.
2. Remove duplicated endpoint strings from manual files.
3. Keep Zod parsing/manual response shaping in the thin SDK layer.
4. Enforce codegen in CI:
   - `bun run generate`
   - fail if generated files are out of date.
5. Add snapshot/contract tests for every public SDK method on:
   - endpoint path
   - HTTP verb
   - request payload/query shape
   - returned SDK shape

## Risks

- OpenAPI spec drift: if endpoints are missing/inaccurate, generated methods may be incomplete.
- Path normalization differences (spec currently contains some trailing `/` routes).
- Some operations lack response schemas, so runtime validation still depends on SDK-side Zod.

## Acceptance Criteria

- `src/api/*.ts` no longer hardcodes endpoint strings (except explicit non-OpenAPI exceptions).
- Public SDK methods and signatures remain backward compatible.
- Compatibility tests pass before/after migration.
- Generated files are deterministic and reproducible from `openapi.json`.
