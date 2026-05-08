# Codebase Structure

**Analysis Date:** 2026-05-08

## Directory Layout

```
meetup-exit/
├── src/                      # Source code (6 strict modules + CLI)
│   ├── auth/                 # Auth providers (AccessToken, OAuthJwtBearer, OAuthRefreshToken)
│   ├── meetup/               # GraphQL client and typed query functions
│   ├── export/               # Export orchestrator (coordinates all workflows)
│   ├── archive/              # File writers (JSONL, CSV, Markdown, manifest, checksums)
│   │   ├── csv/              # CSV writers per entity type
│   │   └── markdown/         # Event Markdown file generation
│   ├── privacy/              # Email filtering, pseudonymization, GDPR reports
│   ├── cli/                  # CLI commands and shared auth options
│   │   ├── commands/         # Individual command implementations
│   │   └── shared/           # Auth option builder shared across commands
│   ├── logging/              # Simple console logger with JSON mode
│   └── errors/               # Custom error types
├── test/                     # Test files (mirror src/ structure)
│   ├── auth/
│   ├── meetup/
│   ├── archive/
│   └── privacy/
├── specs/                    # Specification documents (French)
├── .planning/                # GSD planning directory (auto-generated)
│   └── codebase/             # This analysis
├── dist/                     # Build output (generated, not committed)
├── node_modules/             # Dependencies (generated, not committed)
├── exports/                  # Export archives (generated, not committed)
├── secrets/                  # Private key files (generated, gitignored)
├── schema/                   # GraphQL schema introspection (generated, gitignored)
├── .env                      # Environment variables (gitignored)
├── .env.example              # Example env template
├── .gitignore                # Git ignore rules
├── .mise.toml                # Tool version pinning (Bun, oxlint, oxfmt, etc.)
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite+ build config
├── codegen.yml               # GraphQL Code Generator config
├── package.json              # Package manifest with scripts
├── bun.lock                  # Bun lockfile
├── CLAUDE.md                 # Project guidance for Claude Code
└── README.md                 # Project overview
```

## Directory Purposes

**src/auth/:**

- Purpose: Pluggable authentication providers implementing MeetupAuthProvider interface
- Contains: Three provider implementations, JWT signing utilities, provider type definitions
- Key files: `provider.ts` (interface), `access-token.ts`, `jwt-bearer.ts`, `refresh-token.ts`, `utils.ts`, `index.ts` (barrel export)

**src/meetup/:**

- Purpose: GraphQL client with rate limiting and typed query functions
- Contains: Bottleneck-wrapped GraphQL client, query cost weights, error extraction, typed query functions for all API operations
- Key files: `client.ts` (MeetupGraphqlClient), `functions/` directory with one file per query type

**src/meetup/functions/:**

- Purpose: Typed GraphQL query wrappers (getSelf, listGroups, listEvents, etc.)
- Contains: One query function per file, each with gql query definition and type-safe response handling
- Key files: `get-self.ts`, `list-groups.ts`, `list-events.ts`, `get-event-details.ts`, `list-event-rsvps.ts`, `list-event-registration-answers.ts`, `get-pro-network-probe.ts`

**src/export/:**

- Purpose: Export orchestration — coordinates data fetching, privacy application, and archive writing
- Contains: Main `runExport()` function that manages entire export workflow
- Key files: `orchestrator.ts` (only file in module)

**src/archive/:**

- Purpose: File writers for all export formats and manifest/checksum generation
- Contains: JSONL writer, CSV writers per entity type, Markdown event files, manifest and checksum generation
- Key files: `types.ts` (ArchiveRecord type), `jsonl-writer.ts`, `manifest.ts`, `checksums.ts`, `csv/` and `markdown/` subdirectories

**src/archive/csv/:**

- Purpose: CSV format writers for each entity type (groups, events, rsvps, attendees, registration-answers)
- Contains: One writer function per entity type, each with row type definition
- Key files: `index.ts` (barrel export), `groups.ts`, `events.ts`, `rsvps.ts`, `attendees.ts`, `registration-answers.ts`, `write-csv.ts` (shared csv-stringify wrapper)

**src/archive/markdown/:**

- Purpose: Event Markdown file generation with YAML frontmatter
- Contains: Event markdown writer, slug generation from event title
- Key files: `index.ts` (barrel export), `event.ts`, `slug.ts`

**src/privacy/:**

- Purpose: Privacy filters, stable hashing, PII classification, GDPR report generation
- Contains: Privacy mode enum, filter functions per entity type, stable hash implementation, GDPR report writer
- Key files: `modes.ts` (privacy mode enum), `filter.ts` (applyRsvpPrivacy, applyAttendeePrivacy), `hash.ts` (stableHash), `report.ts` (writeGdprReport), `index.ts` (barrel export)

**src/cli/:**

- Purpose: CLI entry point and command implementations
- Contains: Commander program setup, command definitions, shared auth option builder
- Key files: `main.ts` (program entry), `commands/` directory with one file per command, `shared/auth-options.ts` (auth option builder and flag validation)

**src/cli/commands/:**

- Purpose: Individual command implementations (export, verify-auth, probe-network, introspect)
- Contains: One command file per CLI subcommand
- Key files: `export.ts`, `verify-auth.ts`, `probe-network.ts`, `introspect.ts`

**src/logging/:**

- Purpose: Simple logging interface
- Contains: Logger type interface and factory function
- Key files: `index.ts` (only file in module)

**src/errors/:**

- Purpose: Custom error types
- Contains: AuthenticationError, AuthorizationError, RateLimitedError, GraphqlValidationError, GraphqlExecutionError
- Key files: `index.ts` (only file in module)

**test/:**

- Purpose: Test files (vitest)
- Contains: Tests mirroring src/ structure
- Key files: Tests named `*.test.ts` within directories matching src/ layout

**specs/:**

- Purpose: Project specifications and design documents
- Contains: Implementation phase specs, API design, data formats (all in French)
- Key files: `01-*.md` through `11-*.md` in specification order

## Key File Locations

**Entry Points:**

- `src/cli/main.ts`: CLI program entry point, adds commands, parses argv
- `src/export/orchestrator.ts`: Main export function runExport()
- `src/meetup/client.ts`: GraphQL client instantiation and request routing

**Configuration:**

- `package.json`: Dependencies, scripts, bin entry point
- `tsconfig.json`: TypeScript compiler options
- `vite.config.ts`: Build configuration (vite-plus)
- `codegen.yml`: GraphQL Code Generator schema mapping
- `.env.example`: Template for required env vars
- `.mise.toml`: Tool version pinning (Bun, oxlint, oxfmt)

**Core Logic:**

- `src/auth/provider.ts`: MeetupAuthProvider interface definition
- `src/auth/jwt-bearer.ts`: OAuthJwtBearerAuthProvider (primary MVP auth)
- `src/meetup/client.ts`: MeetupGraphqlClient with Bottleneck + retry
- `src/export/orchestrator.ts`: runExport() orchestration function
- `src/archive/types.ts`: ArchiveRecord envelope type
- `src/privacy/modes.ts`: Privacy mode enum

**Testing:**

- `test/auth/access-token.test.ts`: Example test for AccessTokenAuthProvider
- Test files follow `test/**/*.test.ts` pattern matching src/ structure

## Naming Conventions

**Files:**

- TypeScript files: `.ts` (no `.tsx` — no JSX in this project)
- Test files: `*.test.ts` (vitest naming convention)
- Barrel exports: `index.ts` (re-exports from module subdirectory)
- One entity type per file: `list-groups.ts`, `get-event-details.ts` (hyphens for multi-word)

**Directories:**

- Lowercase, hyphens for multi-word: `csv-stringify`, `jwt-bearer`
- Module names match their single responsibility: `auth/`, `meetup/`, `export/`, `archive/`, `privacy/`, `cli/`, `logging/`, `errors/`
- Subdirectories follow same pattern: `archive/csv/`, `archive/markdown/`, `cli/commands/`, `meetup/functions/`

**Functions:**

- camelCase: `getSelf()`, `listGroups()`, `runExport()`, `createLogger()`
- Verb-first for actions: `writeGroupsCsv()`, `applyRsvpPrivacy()`, `extractMeetupRateLimitResetAt()`
- Provider pattern: `OAuthJwtBearerAuthProvider` (class), `MeetupGraphqlClient` (class)

**Variables & Types:**

- camelCase for values: `authProvider`, `pageCursor`, `effectiveSalt`
- PascalCase for types: `MeetupAuthProvider`, `AuthMode`, `ArchiveRecord`, `ExportOptions`, `MeetupRateLimitConfig`
- CONSTANT_CASE for constants: `PRIVACY_MODES`, `AUTH_MODES`, `MeetupQueryCost`, `PSEUDONYM_PREFIXES`

## Where to Add New Code

**New Feature:**

- Feature logic: Determine which module it belongs to (auth → `src/auth/`, export → `src/export/`, etc.)
- Primary code: Create file in appropriate module directory
- Tests: Create corresponding file in `test/` with same path structure (e.g., `test/auth/new-feature.test.ts`)

**New Command/Subcommand:**

- Implementation: `src/cli/commands/new-command.ts` (follow export.ts pattern)
- Add to program: Import in `src/cli/main.ts` and call `.addCommand(newCommand)`
- Tests: `test/cli/commands/new-command.test.ts`

**New Query Function:**

- Implementation: `src/meetup/functions/query-name.ts` (follow getSelf.ts pattern)
- Include: gql query definition, response type, error handling with throwMeetupRequestError()
- Query cost: Add weight to MeetupQueryCost object in `src/meetup/client.ts`

**New CSV Entity Type:**

- Row type: Define `XxxCsvRow` type in `src/archive/csv/xxx.ts`
- Writer function: `writeXxxCsv(filePath, rows)` in same file
- Privacy filter: If sensitive data, add to `src/privacy/filter.ts`
- Export: Add type and function to `src/archive/csv/index.ts` barrel export

**New Privacy Filter:**

- Implementation: Add filter function to `src/privacy/filter.ts` (e.g., `applyXxxPrivacy()`)
- Mode integration: Update privacy mode logic in `src/export/orchestrator.ts` to call filter when appropriate

**New Error Type:**

- Definition: Add custom error class to `src/errors/index.ts`
- Pattern: Extend Error, set code property, set name property
- Usage: CLI catches and routes to appropriate exit code

**Utilities:**

- Shared helpers: `src/auth/utils.ts` for auth-specific utilities, or create new module if cross-cutting
- Pure functions: Keep in respective module directory
- CLI-specific helpers: `src/cli/shared/` for shared option builders or validators

## Special Directories

**node_modules/:**

- Purpose: Dependencies installed via bun
- Generated: Yes (run `bun install`)
- Committed: No (in .gitignore)

**dist/:**

- Purpose: Built output from `vp pack` (ESM bundle + .d.ts)
- Generated: Yes (run `bun run build`)
- Committed: No (in .gitignore)
- Entry: `dist/cli/main.js` (bin entry in package.json)

**exports/:**

- Purpose: Default output directory for export archives
- Generated: Yes (created by runExport during export command)
- Committed: No (in .gitignore)
- Format: `exports/meetup-YYYY-MM-DD/` with manifest.json, raw/_.jsonl, csv/_.csv, markdown/events/, reports/, checksums/

**secrets/:**

- Purpose: Private key files for OAuth JWT Bearer auth
- Generated: No (user must create and place PEM files here)
- Committed: No (in .gitignore)
- Format: PEM-encoded RSA private key, referenced by --private-key flag or MEETUP_PRIVATE_KEY_PATH env var

**schema/:**

- Purpose: GraphQL schema introspection JSON for code generation
- Generated: Yes (run `bun run codegen` after `meetup-exit introspect --out schema/introspection.json`)
- Committed: No (in .gitignore)
- Usage: Referenced in codegen.yml, used by @graphql-codegen to generate types

**.planning/:**

- Purpose: GSD planning directory
- Generated: Yes (by GSD orchestrator)
- Committed: Yes
- Contains: codebase analysis documents (ARCHITECTURE.md, STRUCTURE.md, etc.)

---

_Structure analysis: 2026-05-08_