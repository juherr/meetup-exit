# 09 — Backlog MVP

## Epic 1 — Bootstrap projet

### Ticket 1.1 — Initialiser projet TypeScript CLI

Critères:

- pnpm;
- TypeScript strict;
- vitest;
- eslint/prettier;
- tsup;
- commande `meetup-exit --help`.

### Ticket 1.2 — Ajouter structure modules

Créer:

- `auth`;
- `meetup`;
- `export`;
- `archive`;
- `privacy`;
- `cli`.

## Epic 2 — Auth

### Ticket 2.1 — AccessTokenAuthProvider

Critères:

- provider simple;
- test unitaire;
- masquage token logs.

### Ticket 2.2 — OAuthJwtBearerAuthProvider

Critères:

- signe JWT RS256 avec `jose`;
- POST token endpoint;
- cache access token;
- tests unitaires avec fetch mocké.

### Ticket 2.3 — OAuthRefreshTokenAuthProvider

Critères:

- POST refresh token;
- persiste nouveau refresh token;
- test single-use behavior côté storage.

### Ticket 2.4 — Commande `verify-auth`

Critères:

- appelle `self`;
- affiche id/name/email si dispo;
- exit code 2 en cas auth error.

## Epic 3 — GraphQL client

### Ticket 3.1 — MeetupGraphqlClient

Critères:

- endpoint configurable;
- bearer token provider;
- `graphql-request`;
- erreurs structurées.

### Ticket 3.2 — Rate limit Bottleneck

Critères:

- reservoir configurable;
- maxConcurrent configurable;
- retry `RATE_LIMITED` basé sur `resetAt`.

### Ticket 3.3 — Paginator générique

Critères:

- cursor-based;
- stop conditions;
- loop detection;
- tests unitaires.

## Epic 4 — Introspection et codegen

### Ticket 4.1 — Commande `introspect`

Critères:

- écrit `schema/introspection.json`;
- hash sha256;
- gère erreur auth.

### Ticket 4.2 — Config GraphQL Codegen

Critères:

- génération types;
- queries `.graphql`;
- documentation dev.

## Epic 5 — Export données

### Ticket 5.1 — Probe network

Critères:

- vérifie `proNetwork`;
- lit un aperçu `groupsSearch`;
- message clair droits insuffisants.

### Ticket 5.2 — Export groupes

Critères:

- pagination;
- raw JSONL;
- CSV groups.

### Ticket 5.3 — Export événements

Critères:

- par statut;
- raw events;
- event details;
- CSV events.

### Ticket 5.4 — Export RSVPs

Critères:

- récupère RSVPs accessibles;
- emails si disponibles;
- raw JSONL;
- CSV rsvps/attendees;
- mode no-email respecté.

### Ticket 5.5 — Export registration answers

Critères:

- query documentée;
- raw JSONL;
- CSV answers;
- association event id.

### Ticket 5.6 — Export photos metadata

Critères:

- extrait featuredEventPhoto;
- construit URL;
- CSV photos.

## Epic 6 — Archive writers

### Ticket 6.1 — JSONL writer

Critères:

- append;
- UTF-8;
- newline;
- test escaping.

### Ticket 6.2 — CSV writer

Critères:

- headers stables;
- escaping correct;
- privacy filters.

### Ticket 6.3 — Markdown writer

Critères:

- frontmatter;
- slugification;
- public-archive safe.

### Ticket 6.4 — Manifest writer

Critères:

- counts;
- metrics;
- errors;
- checksums.

## Epic 7 — Privacy

### Ticket 7.1 — Email filtering

Critères:

- no-email sur CSV/Markdown;
- tests.

### Ticket 7.2 — Pseudonymization

Critères:

- hash stable;
- salt requis;
- pas de salt dans archive publique.

### Ticket 7.3 — GDPR report

Critères:

- liste fichiers privés;
- liste fichiers publiables;
- warnings newsletter/CRM.

## Epic 8 — Convert

### Ticket 8.1 — Commande `convert`

Critères:

- lit raw JSONL existant;
- régénère CSV/Markdown;
- applique privacy mode.

## Epic 9 — Résilience

### Ticket 9.1 — Resume basic

Critères:

- évite doublons;
- index local simple;
- option `--resume`.

### Ticket 9.2 — Error records

Critères:

- `raw/errors.jsonl`;
- `reports/errors.md`;
- export continue sur entités indépendantes.

## Epic 10 — Documentation

### Ticket 10.1 — README usage

Critères:

- setup OAuth Client;
- JWT bearer;
- export complet;
- privacy modes.

### Ticket 10.2 — `.env.example`

Critères:

- toutes variables;
- commentaires anglais.

### Ticket 10.3 — Security guide

Critères:

- tokens;
- private key;
- exports full;
- gitignore.