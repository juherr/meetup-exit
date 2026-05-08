# 06 — Format d'archive

## 1. Structure de sortie

```text
exports/meetup-YYYY-MM-DD/
  manifest.json
  schema/
    introspection.json
    schema.graphql
  raw/
    self.jsonl
    pro-network.jsonl
    groups.jsonl
    events.jsonl
    event-details.jsonl
    rsvps.jsonl
    registration-answers.jsonl
    photos.jsonl
    errors.jsonl
  csv/
    groups.csv
    events.csv
    rsvps.csv
    attendees.csv
    registration-answers.csv
    photos.csv
  markdown/
    events/
      2024-10-17-event-title.md
  reports/
    export-summary.md
    gdpr-review.md
    errors.md
  checksums/
    sha256.txt
```

## 2. JSONL brut

Chaque ligne est un `ArchiveRecord`.

```json
{
  "source": "meetup",
  "exportedAt": "2026-05-08T08:15:00.000Z",
  "entityType": "event",
  "sourceId": "305912103",
  "parentIds": {
    "groupId": "6622782"
  },
  "raw": {
    "id": "305912103",
    "title": "Testing API things 1"
  }
}
```

## 3. Règles JSONL

- Une ligne = un record.
- Pas de pretty-print.
- UTF-8.
- Newline final.
- Les erreurs exportables vont dans `raw/errors.jsonl`.
- Les records doivent être append-only pendant une étape.
- En mode resume, utiliser un index `.meetup-exit/index.json` ou `.sqlite` futur.

## 4. CSV

### 4.1 `groups.csv`

Colonnes:

```csv
group_id,name,urlname,memberships_total_count
```

### 4.2 `events.csv`

Colonnes:

```csv
event_id,group_id,group_name,group_urlname,title,event_url,date_time,duration,host_names,host_member_ids,featured_photo_id,featured_photo_base_url
```

### 4.3 `rsvps.csv`

Colonnes MVP:

```csv
event_id,rsvp_id,member_name,member_email
```

Colonnes si disponibles:

```csv
event_id,rsvp_id,member_id,member_name,member_email,response,guests,created_at,updated_at
```

### 4.4 `attendees.csv`

Vue dénormalisée:

```csv
member_email,member_name,event_id,event_title,event_date_time,rsvp_id
```

Mode `no-email`:

```csv
member_email
```

doit être vide.

Mode `pseudonymized`:

```csv
member_id_hash,member_email_hash,member_name_hash
```

### 4.5 `registration-answers.csv`

Colonnes MVP:

```csv
event_id,event_title,question,answer
```

Colonnes si disponibles:

```csv
event_id,event_title,rsvp_id,member_id,member_name,member_email,question,answer
```

## 5. Markdown événement

Fichier:

```text
markdown/events/YYYY-MM-DD-slug.md
```

Frontmatter:

```yaml
---
source: meetup
event_id: "305912103"
group_id: "6622782"
group_name: "Whiskey Wednesdays"
title: "Testing API things 1"
date_time: "2025-02-19T19:00:00-07:00"
duration: "PT0S"
event_url: "https://www.meetup.com/..."
hosts:
  - member_id: "246752233"
    name: "Test"
featured_photo:
  id: "495693322"
  base_url: "https://secure-content.meetupstatic.com/images/classic-events/"
privacy_mode: public-archive
---
```

Contenu:

```markdown
# Testing API things 1

Event date: 2025-02-19T19:00:00-07:00

## Description

...
```

En mode public:

- ne pas inclure RSVPs;
- ne pas inclure emails;
- ne pas inclure réponses formulaires.

## 6. Manifest

Exemple:

```json
{
  "tool": "meetup-exit",
  "version": "0.1.0",
  "startedAt": "2026-05-08T08:15:00.000Z",
  "finishedAt": "2026-05-08T08:22:12.000Z",
  "endpoint": "https://api.meetup.com/gql-ext",
  "networkUrlname": "elsassjug",
  "authMode": "jwt-bearer",
  "privacyMode": "full",
  "rawPrivacyMode": "full",
  "includes": {
    "groups": true,
    "events": true,
    "rsvps": true,
    "registrationAnswers": true,
    "photos": true
  },
  "counts": {
    "groups": 1,
    "events": 120,
    "rsvps": 3400,
    "registrationAnswers": 230,
    "photos": 87,
    "errors": 0
  },
  "metrics": {
    "graphqlRequests": 350,
    "rateLimitedRetries": 0,
    "durationSeconds": 432
  },
  "schemaIntrospectionSha256": "sha256:..."
}
```

## 7. Checksums

Créer `checksums/sha256.txt`:

```text
<sha256>  raw/events.jsonl
<sha256>  csv/events.csv
```

## 8. Rapports

### 8.1 `export-summary.md`

Contenu:

- réseau;
- date;
- mode privacy;
- compte exportateur;
- counts;
- erreurs;
- fichiers générés.

### 8.2 `gdpr-review.md`

Contenu:

- champs PII détectés;
- fichiers contenant emails;
- fichiers publiables;
- fichiers à garder privés;
- recommandations.

### 8.3 `errors.md`

Contenu:

- erreurs par stage;
- entités impactées;
- actions recommandées.

## 9. Slugification

Règle:

- lowercase;
- retirer accents;
- remplacer non alphanum par `-`;
- compacter `-`;
- limiter à 80 caractères;
- fallback `event-${id}`.

## 10. Encodage

- UTF-8 partout.
- CSV avec header.
- Valeurs CSV échappées correctement.
- Newline `\n`.