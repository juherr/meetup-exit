# 07 — Spécification CLI

## 1. Nom

```bash
meetup-exit
```

## 2. Commandes

### 2.1 `verify-auth`

Vérifie le token et affiche `self`.

```bash
meetup-exit verify-auth \
  --auth jwt-bearer \
  --client-key "$MEETUP_CLIENT_KEY" \
  --member-id "$MEETUP_AUTHORIZED_MEMBER_ID" \
  --signing-key-id "$MEETUP_SIGNING_KEY_ID" \
  --private-key ./secrets/meetup-private-key.pem
```

Options:

- `--auth access-token|jwt-bearer|refresh-token`
- `--access-token`
- `--client-key`
- `--client-secret`
- `--member-id`
- `--signing-key-id`
- `--private-key`
- `--refresh-token-file`
- `--endpoint`

### 2.2 `probe-network`

Vérifie l'accès au réseau Pro.

```bash
meetup-exit probe-network --network elsassjug
```

Sortie:

- réseau accessible;
- nombre groupes si disponible;
- exemple de groupes.

### 2.3 `introspect`

Exporte le schéma.

```bash
meetup-exit introspect --out ./schema/introspection.json
```

Options:

- `--out`
- `--schema-sdl-out`
- `--force`

### 2.4 `export`

Commande principale.

```bash
meetup-exit export \
  --network elsassjug \
  --out ./exports/meetup-2026-05-08 \
  --auth jwt-bearer \
  --include-groups \
  --include-events \
  --include-rsvps \
  --include-registration-answers \
  --include-photos \
  --privacy-mode full
```

Options:

- `--network <urlname>` required;
- `--out <dir>` required;
- `--auth <mode>`;
- `--privacy-mode full|no-email|pseudonymized|public-archive`;
- `--raw-privacy full|filtered`;
- `--include-groups`;
- `--include-events`;
- `--include-rsvps`;
- `--include-registration-answers`;
- `--include-photos`;
- `--event-status <status>` repeatable;
- `--all-event-statuses`;
- `--page-size <n>` default 100;
- `--max-concurrent <n>` default 2;
- `--resume`;
- `--json-logs`;
- `--dry-run`.

### 2.5 `convert`

Convertit une archive brute existante.

```bash
meetup-exit convert \
  --input ./exports/meetup-2026-05-08 \
  --out ./public-archive \
  --formats csv,markdown \
  --privacy-mode public-archive
```

Options:

- `--input`;
- `--out`;
- `--formats csv,markdown`;
- `--privacy-mode`;
- `--force`.

### 2.6 `doctor`

Vérifie la configuration locale.

```bash
meetup-exit doctor
```

Contrôles:

- Node version;
- variables env;
- accès private key;
- permissions private key;
- dossier output writable;
- auth mode cohérent.

## 3. Variables d'environnement

```env
MEETUP_AUTH_MODE=jwt-bearer
MEETUP_ENDPOINT=https://api.meetup.com/gql-ext
MEETUP_CLIENT_KEY=
MEETUP_CLIENT_SECRET=
MEETUP_AUTHORIZED_MEMBER_ID=
MEETUP_SIGNING_KEY_ID=
MEETUP_PRIVATE_KEY_PATH=
MEETUP_ACCESS_TOKEN=
MEETUP_REFRESH_TOKEN_FILE=
```

## 4. Exemples

### 4.1 Export complet privé

```bash
meetup-exit export \
  --network elsassjug \
  --out ./exports/elsassjug-full \
  --privacy-mode full \
  --raw-privacy full \
  --include-groups \
  --include-events \
  --include-rsvps \
  --include-registration-answers \
  --include-photos
```

### 4.2 Export public

```bash
meetup-exit export \
  --network elsassjug \
  --out ./exports/elsassjug-public \
  --privacy-mode public-archive \
  --raw-privacy filtered \
  --include-groups \
  --include-events \
  --include-photos
```

### 4.3 Convertir un full export en public

```bash
meetup-exit convert \
  --input ./exports/elsassjug-full \
  --out ./exports/elsassjug-public \
  --formats markdown,csv \
  --privacy-mode public-archive
```

## 5. Sortie console

### Succès

```text
Authenticated as Julien Herr (123456)
Network elsassjug is accessible
Export completed
- groups: 1
- events: 143
- rsvps: 4288
- registration answers: 96
- errors: 0
Archive: ./exports/elsassjug-full
```

### Export partiel

```text
Export completed with errors
- groups: 1
- events: 143
- rsvps: 4170
- registration answers: 96
- errors: 3

See:
- reports/errors.md
- raw/errors.jsonl
```

Exit code: `4`.

## 6. Règles CLI

- Ne jamais demander d'information interactive dans le MVP.
- Toute option doit pouvoir venir d'env.
- Les secrets ne doivent jamais apparaître dans les logs.
- `--dry-run` ne doit pas écrire les exports, sauf logs temporaires si explicitement demandé.