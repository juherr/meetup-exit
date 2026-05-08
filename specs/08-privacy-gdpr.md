# 08 — Privacy / RGPD

## 1. Objectif

L'outil n'est pas un conseil juridique. Il doit aider techniquement à éviter une fuite de données personnelles et à distinguer:

- archive privée complète;
- exports de travail;
- archive publique publiable.

## 2. Données personnelles identifiées

Champs sensibles ou personnels probables:

- `member.email`;
- `member.name`;
- member id;
- RSVP id;
- réponses libres aux formulaires;
- présence/absence à un événement;
- date d'inscription ou RSVP si disponible;
- profil membre si disponible.

## 3. Classification fichiers

### Privé par défaut

- `raw/rsvps.jsonl`
- `raw/registration-answers.jsonl`
- `csv/rsvps.csv`
- `csv/attendees.csv`
- `csv/registration-answers.csv`
- `reports/gdpr-review.md` si contient exemples PII.

### Potentiellement public après filtre

- `csv/events.csv`
- `markdown/events/*.md`
- `csv/groups.csv`
- photos d'événements si licence/usage OK.

## 4. Modes privacy

### 4.1 `full`

- conserve tout;
- rapport signale fichiers privés;
- aucun fichier public généré par défaut sauf demandé.

### 4.2 `no-email`

- retire emails dans CSV/Markdown;
- conserve noms membres sauf option future;
- JSON brut selon `--raw-privacy`.

### 4.3 `pseudonymized`

- remplace email/name/id membre par hashes stables;
- nécessite `--pseudonymization-salt` ou génération d'un salt local;
- le salt ne doit pas être inclus dans l'archive publique.

### 4.4 `public-archive`

- retire tout participant;
- retire réponses formulaires;
- conserve uniquement événements/groupes/photos autorisées;
- recommandé pour publication web.

## 5. Hash stable

```ts
import { createHash } from "node:crypto";

export function stableHash(value: string, salt: string): string {
  return createHash("sha256").update(salt).update(":").update(value).digest("hex").slice(0, 12);
}
```

Préfixes:

- `member_${hash}`;
- `email_${hash}`;
- `rsvp_${hash}`.

## 6. Rapport RGPD

Le rapport doit contenir:

```markdown
# GDPR Review

## Private files

- raw/rsvps.jsonl: contains member names and emails.
- raw/registration-answers.jsonl: may contain free text personal data.

## Public-safe files

- markdown/events/\*.md generated with public-archive mode.
- csv/events.csv generated with public-archive mode.

## Recommendations

- Do not publish full raw export.
- Validate consent before importing emails into a newsletter tool.
- Keep private archive access restricted.
```

## 7. Consentement newsletter / CRM

Règle stricte:

- La présence d'un email dans Meetup Pro ne doit pas être interprétée comme un consentement newsletter.
- Le projet peut exporter les emails techniquement, mais il doit marquer le CSV newsletter comme "requires consent validation".
- Aucune intégration newsletter automatique en MVP.

## 8. Rétention

Le manifest peut contenir une recommandation:

- archive privée: stockage chiffré;
- archive publique: données filtrées;
- exports intermédiaires: suppression après migration.

## 9. Sécurité locale

- Dossiers `exports/*` à exclure de Git par défaut.
- Avertissement si export `full` dans un repo Git non ignoré.
- Option future: chiffrage archive.