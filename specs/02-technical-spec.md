# 02 — Spécifications techniques

## 1. Stack

- Langage: TypeScript.
- Runtime cible: Node.js 20+.
- Package manager: pnpm.
- CLI: `commander` ou `clipanion`. Recommandation MVP: `commander`.
- GraphQL client: `graphql-request`.
- GraphQL typing: GraphQL Code Generator.
- JWT/JWS: `jose`.
- Rate limiting: `bottleneck`.
- Validation runtime: `zod`.
- CSV: `csv-stringify` ou writer maison minimal.
- Tests: `vitest`.
- Lint/format: ESLint + Prettier.
- Build: `tsup`.

## 2. Principes

### 2.1 Séparation stricte

```text
auth     -> obtaining OAuth access tokens
meetup   -> typed GraphQL calls
export   -> orchestration
archive  -> writing raw and derived files
privacy  -> filtering/pseudonymization
cli      -> commands and options
```

### 2.2 Pas de logique métier dans le client GraphQL

Le client GraphQL:

- ajoute le bearer token;
- applique rate limit;
- exécute la requête;
- gère retry `RATE_LIMITED`;
- remonte les erreurs structurées.

Il ne connaît pas les dossiers d'export.

### 2.3 Archive brute prioritaire

Toute donnée brute doit pouvoir être rejouée en convertisseurs sans refaire d'appel API.

## 3. Structure de projet

```text
meetup-exit/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  README.md

  packages/
    core/
      src/
        auth/
        meetup/
        export/
        archive/
        privacy/
        logging/
        errors/
      test/

    cli/
      src/
        main.ts
        commands/
      test/

  examples/
    export-network.ts
    convert-archive.ts

  docs/
    functional-spec.md
    technical-spec.md
```

Pour un MVP rapide, il est acceptable de commencer en mono-package:

```text
src/
  auth/
  meetup/
  export/
  archive/
  privacy/
  cli/
```

Mais le design doit rester extractible.

## 4. Modules

### 4.1 `auth`

Contrat:

```ts
export type MeetupAuthProvider = {
  getAccessToken(): Promise<string>;
};
```

Implémentations:

- `AccessTokenAuthProvider`;
- `OAuthJwtBearerAuthProvider`;
- `OAuthRefreshTokenAuthProvider`.

### 4.2 `meetup`

Responsabilités:

- construire `GraphQLClient`;
- exécuter les opérations typées;
- appliquer `Bottleneck`;
- gérer retry;
- exposer des fonctions de haut niveau:
  - `getSelf`;
  - `getProNetworkProbe`;
  - `listGroups`;
  - `listEvents`;
  - `getEventDetails`;
  - `listEventRegistrationAnswers`.

### 4.3 `export`

Responsabilités:

- orchestrer les étapes;
- gérer include/exclude;
- gérer reprise;
- écrire erreurs et manifest;
- agréger métriques.

### 4.4 `archive`

Responsabilités:

- écrire JSONL;
- écrire CSV;
- écrire Markdown;
- écrire `manifest.json`;
- calculer checksums.

### 4.5 `privacy`

Responsabilités:

- filtrage email;
- pseudonymisation;
- classification PII;
- rapport RGPD.

### 4.6 `cli`

Responsabilités:

- parser options;
- charger config/env;
- appeler le core;
- afficher logs humains;
- codes de sortie.

## 5. Types principaux

### 5.1 Archive record

```ts
export type ArchiveEntityType =
  | "self"
  | "pro_network"
  | "group"
  | "event"
  | "rsvp"
  | "registration_answer"
  | "photo"
  | "error";

export type ArchiveRecord<T> = {
  source: "meetup";
  exportedAt: string;
  entityType: ArchiveEntityType;
  sourceId: string;
  parentIds?: Record<string, string>;
  raw: T;
};
```

### 5.2 Export config

```ts
export type PrivacyMode = "full" | "no-email" | "pseudonymized" | "public-archive";

export type ExportConfig = {
  networkUrlname: string;
  outputDir: string;
  pageSize: number;
  concurrency: number;
  resume: boolean;
  privacyMode: PrivacyMode;
  rawPrivacyMode: "full" | "filtered";
  includes: {
    groups: boolean;
    events: boolean;
    rsvps: boolean;
    registrationAnswers: boolean;
    photos: boolean;
  };
  eventStatuses: string[];
};
```

### 5.3 Manifest

```ts
export type ExportManifest = {
  tool: "meetup-exit";
  version: string;
  startedAt: string;
  finishedAt?: string;
  endpoint: string;
  networkUrlname: string;
  authMode: "access-token" | "jwt-bearer" | "refresh-token";
  privacyMode: PrivacyMode;
  rawPrivacyMode: "full" | "filtered";
  schemaIntrospectionSha256?: string;
  counts: Record<string, number>;
  errors: Array<{
    stage: string;
    entityType?: string;
    sourceId?: string;
    message: string;
  }>;
};
```

## 6. GraphQL Codegen

Le projet doit récupérer le schéma par introspection:

```bash
meetup-exit introspect --out schema/introspection.json
```

Puis générer les types:

```yaml
schema: schema/introspection.json
documents: "src/meetup/queries/**/*.graphql"
generates:
  src/meetup/generated/graphql.ts:
    plugins:
      - typescript
      - typescript-operations
      - typescript-graphql-request
```

## 7. Gestion des erreurs

### 7.1 Types d'erreur

- `AuthenticationError`
- `AuthorizationError`
- `RateLimitedError`
- `GraphqlValidationError`
- `GraphqlExecutionError`
- `ArchiveWriteError`
- `PartialExportError`

### 7.2 Comportement

- Auth échoue: stop immédiat.
- Réseau inaccessible: stop immédiat.
- Introspection échoue: warning si non obligatoire, stop si commande `introspect`.
- Un événement échoue: continuer, logguer, compter erreur.
- Rate limit: retry automatique.
- Erreurs répétées: backoff puis abandon de l'entité.

## 8. Codes de sortie CLI

- `0`: succès complet.
- `1`: erreur fonctionnelle ou technique.
- `2`: erreur d'authentification.
- `3`: accès réseau Pro refusé/introuvable.
- `4`: export partiel avec erreurs.
- `5`: configuration invalide.

## 9. Logs

Format humain par défaut:

```text
[meetup-exit] verifying auth...
[meetup-exit] authenticated as ...
[meetup-exit] exporting groups: 42 records
[meetup-exit] exporting events status=UPCOMING: 12 records
[meetup-exit] exporting event details: 120/320
```

Option `--json-logs` pour CI.

## 10. Sécurité

- Ne jamais logger access token, refresh token, private key.
- Refuser les fichiers private key avec permissions trop larges si possible.
- Supporter private key via fichier ou env var.
- Ne pas committer `exports/`, `.env`, clés privées.
- Documenter la rotation des clés.

## 11. Performance

Valeurs par défaut:

- `pageSize=100`;
- `concurrency=2`;
- `reservoir=450`;
- `reservoirRefreshInterval=60000`;
- `maxRetries=3`.

## 12. Compatibilité

- Node.js 20+.
- macOS/Linux.
- Windows best effort.