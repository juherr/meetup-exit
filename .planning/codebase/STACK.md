# Technology Stack

**Analysis Date:** 2026-05-08

## Languages

**Primary:**
- TypeScript 5.9.3 - Full codebase (`src/`, `test/`), strict mode enabled

**Secondary:**
- GraphQL - Meetup API query definitions (`src/meetup/queries/`)

## Runtime

**Environment:**
- Bun 1.3.13 (pinned in `.mise.toml`) - TypeScript runtime, runs TS files natively without compilation

**Package Manager:**
- Bun (implicit, via bun.lock)
- Node.js 24.15.0 (pinned in `.mise.toml`, used for build toolchain)
- Lockfile: `bun.lock` present (141.9K)

## Frameworks

**Core:**
- Commander 14.0.0 - CLI command framework (`src/cli/main.ts`, `src/cli/commands/`)

**GraphQL:**
- graphql-request 7.1.2 - HTTP client for GraphQL queries (`src/meetup/client.ts`)
- graphql 16.11.0 - GraphQL language support
- GraphQL Code Generator 5.0.7+ - Generates typed query functions from `.graphql` files
  - Plugins: typescript, typescript-operations, typescript-graphql-request
  - Config: `codegen.yml`
  - Output: `src/meetup/generated/graphql.ts`

**Testing:**
- vite-plus 0.1.17 - Unified build/test/lint toolchain (runs via `vp` command)
  - Includes: Vitest (test runner), oxlint (linter), oxfmt (formatter), tsc (type checker)

**Build/Dev:**
- Vite (via vite-plus) - Build configuration in `vite.config.ts`
  - Outputs ESM format to `dist/cli/main.js` with TypeScript definitions

## Key Dependencies

**Critical:**
- jose 6.0.10 - JWT/JWS signing for OAuth 2 JWT Bearer flow (`src/auth/jwt-bearer.ts`)
  - Uses RS256 algorithm, handles PEM key import
- bottleneck 2.19.5 - Rate limiter for API requests (`src/meetup/client.ts`)
  - Enforces Meetup's 500-point rate limit (450 req/min safety margin)
  - Default: 2 max concurrent, 250ms min time between requests

**Infrastructure:**
- csv-stringify 6.5.2 - CSV file generation (`src/archive/csv/write-csv.ts`)
  - Synchronous API for writing CSV files with headers
- zod 3.25.23 - Runtime validation for configuration and external data
  - Used for auth config validation, API response validation

**Utilities:**
- Node.js built-in modules: `fs/promises`, `path`, `crypto`, `http`
  - File I/O, JSONL writing, HMAC/hash operations, OAuth requests

## Configuration

**Environment:**
- `.env` file (gitignored) - Runtime configuration loading
- Environment variables with `MEETUP_*` prefix - All CLI options can be set via env vars
  - See `.env.example` for full list
  - `MEETUP_ENDPOINT=https://api.meetup.com/gql-ext` - GraphQL endpoint
  - `MEETUP_AUTH_MODE` - One of: `access-token`, `jwt-bearer`, `refresh-token`
  - `MEETUP_PRIVATE_KEY_PATH` - Path to RSA private key PEM file (for JWT Bearer)
  - `MEETUP_CLIENT_KEY`, `MEETUP_CLIENT_SECRET` - OAuth credentials
  - `MEETUP_REFRESH_TOKEN_FILE` - Path to single-use refresh token file

**TypeScript:**
- `tsconfig.json` - Strict mode enabled, ESNext target, bundler module resolution
  - `exactOptionalPropertyTypes: true` - Enforces strict optional properties
  - `noImplicitOverride: true` - Requires explicit `override` on inherited methods
  - Path aliases: `vitest` → test framework

**Build:**
- `vite.config.ts` - Outputs ESM format with TypeScript definitions
  - Entry: `src/cli/main.ts`
  - Output directory: `dist/cli/`

**CodeGen:**
- `codegen.yml` - GraphQL code generation config
  - Schema: `schema/introspection.json` (introspected from Meetup API, gitignored)
  - Generates TypeScript types from `.graphql` query files

## Platform Requirements

**Development:**
- Bun 1.3.13+ for native TypeScript execution
- Node.js 24.15.0+ for build toolchain
- `.mise.toml` defines pinned versions (use `mise install`)

**Production:**
- Bun runtime (published as ESM CLI binary `dist/cli/main.js`)
- No external databases or services required
- File system write access for output directories
- HTTPS connectivity to Meetup API (`api.meetup.com`, `secure.meetup.com`)

---

*Stack analysis: 2026-05-08*
