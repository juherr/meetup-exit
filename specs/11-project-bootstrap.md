# 11 — Project bootstrap

## 1. Initialisation

```bash
mkdir meetup-exit
cd meetup-exit
pnpm init
pnpm add graphql graphql-request bottleneck jose zod commander dotenv csv-stringify
pnpm add -D typescript tsx tsup vitest @types/node eslint prettier @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typescript-graphql-request
```

## 2. package.json cible

```json
{
  "name": "meetup-exit",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "meetup-exit": "./dist/cli/main.js"
  },
  "scripts": {
    "dev": "tsx src/cli/main.ts",
    "build": "tsup src/cli/main.ts --format esm --dts --clean",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "codegen": "graphql-codegen --config codegen.yml"
  }
}
```

## 3. tsconfig

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src", "test"]
}
```

## 4. .gitignore

```gitignore
node_modules/
dist/
.env
.env.*
!.env.example
exports/
secrets/
schema/introspection.json
schema/schema.graphql
```

## 5. Commentaires de code

Tous les commentaires de code doivent être en anglais.

Exemple:

```ts
// Keep a safety margin below Meetup's documented rate limit.
```

## 6. Conventions

- Fonctions pures quand possible.
- Types exportés depuis les modules publics.
- Pas de `any` sauf frontière d'erreur externe.
- Utiliser `unknown` pour erreurs.
- Valider les configs avec `zod`.
- Ne pas mettre de secrets dans les erreurs.

## 7. Exemple de config

`.env.example`:

```env
# Meetup GraphQL endpoint
MEETUP_ENDPOINT=https://api.meetup.com/gql-ext

# Authentication mode: access-token, jwt-bearer, refresh-token
MEETUP_AUTH_MODE=jwt-bearer

# Debug token mode
MEETUP_ACCESS_TOKEN=

# OAuth JWT bearer mode
MEETUP_CLIENT_KEY=
MEETUP_AUTHORIZED_MEMBER_ID=
MEETUP_SIGNING_KEY_ID=
MEETUP_PRIVATE_KEY_PATH=./secrets/meetup-private-key.pem

# OAuth refresh token mode
MEETUP_CLIENT_SECRET=
MEETUP_REFRESH_TOKEN_FILE=./secrets/meetup-refresh-token.txt
```

## 8. Première séquence dev

1. Bootstrap CLI.
2. Implement `AccessTokenAuthProvider`.
3. Implement `MeetupGraphqlClient`.
4. Implement `verify-auth`.
5. Implement `OAuthJwtBearerAuthProvider`.
6. Implement `probe-network`.
7. Implement `introspect`.
8. Generate schema/types.
9. Implement exports in order:
   - groups;
   - events;
   - event details;
   - rsvps;
   - registration answers.