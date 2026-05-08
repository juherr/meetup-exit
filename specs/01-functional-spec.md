# 01 — Spécifications fonctionnelles

## 1. Contexte

Un organisateur Meetup Pro souhaite quitter Meetup sans perdre les données de son réseau/groupe: historique des événements, inscriptions, RSVPs, réponses aux formulaires, photos, informations groupe, et exports exploitables pour archive, site statique, CRM ou migration.

Meetup fournit une API GraphQL permettant de récupérer une partie importante de ces données, mais pas un export complet prêt à l'emploi. `meetup-exit` doit combler cet écart.

## 2. Vision produit

`meetup-exit` doit être:

- reproductible: un export peut être relancé et comparé;
- non destructif: les réponses brutes doivent être conservées;
- typé: les requêtes GraphQL doivent être validées par introspection/codegen;
- prudent sur le RGPD: les données personnelles doivent être identifiées, séparables et exportables en plusieurs modes;
- utilisable comme CLI en premier, puis comme lib TypeScript;
- orienté sortie de plateforme, pas administration quotidienne de Meetup.

## 3. Personas

### 3.1 Organisateur Meetup Pro

Objectif: récupérer les données avant résiliation.

Besoins:

- vérifier rapidement que l'accès API fonctionne;
- exporter tout l'historique disponible;
- obtenir des CSV lisibles;
- conserver une archive brute;
- identifier les emails et données personnelles.

### 3.2 Développeur intégrateur

Objectif: adapter l'export à une cible spécifique.

Besoins:

- importer la lib dans un script;
- accéder aux records bruts;
- écrire un writer custom;
- contrôler rate limit, page size, retries, privacy mode.

### 3.3 Responsable association / communauté

Objectif: pouvoir publier une archive publique des événements sans exposer de données personnelles.

Besoins:

- produire du Markdown/HTML public;
- retirer emails, RSVPs privés, réponses libres;
- conserver les photos autorisées si possible.

## 4. Périmètre fonctionnel

### 4.1 Inclus MVP

- Authentification par access token direct.
- Authentification par OAuth 2 JWT Bearer.
- Vérification de l'authentification via `self`.
- Vérification de l'accès à un `proNetwork`.
- Introspection du schéma GraphQL.
- Export des groupes du réseau Pro.
- Export des événements du réseau Pro par statut.
- Export du détail des événements.
- Export des RSVPs accessibles.
- Export des emails RSVP quand disponibles et autorisés.
- Export des réponses aux formulaires d'inscription.
- Export des métadonnées photo.
- Génération JSONL brut.
- Génération CSV.
- Génération Markdown par événement.
- Manifest d'export.
- Rapport RGPD.
- Rate limit et retry.
- Logs d'avancement.
- Reprise partielle basique: ne pas réécrire inutilement les fichiers déjà terminés si `--resume`.

### 4.2 Exclu MVP

- Mutation GraphQL Meetup.
- Import automatique dans une plateforme cible.
- UI web.
- Synchronisation continue.
- Déduplication avancée entre exports.
- Gestion multi-compte interactive OAuth complète hors refresh/JWT.
- Envoi newsletter.
- Suppression ou modification de données Meetup.

### 4.3 Extension future

- Export ICS.
- Export Mobilizon.
- Export WordPress/Hugo/Antora.
- Rapport différentiel entre deux exports.
- Mode anonymisation avancée avec mapping stable.
- Téléchargement binaire des photos.
- Support multi-network.
- Packaging Docker.
- GitHub Action.

## 5. Données à exporter

### 5.1 Réseau Pro

Données attendues:

- id réseau si disponible;
- nom réseau si disponible;
- urlname;
- date/heure d'export;
- données brutes.

### 5.2 Groupes

Champs minimum documentés:

- `id`;
- `name`;
- `urlname`;
- `memberships.totalCount`.

Champs supplémentaires à découvrir par introspection:

- description;
- timezone;
- city/country;
- topics;
- organizer;
- visibility;
- photo;
- createdAt/updateAt si disponibles.

### 5.3 Événements

Champs documentés:

- `id`;
- `title`;
- `eventUrl`;
- `description`;
- `dateTime`;
- `duration`;
- `eventHosts { memberId name }`;
- `featuredEventPhoto { id baseUrl }`;
- `group { id name urlname }`;
- `rsvps`.

Champs à découvrir:

- venue;
- online/hybrid/in-person type;
- status;
- publish status;
- createdAt/updatedAt;
- capacity;
- fee/ticketing;
- event series;
- topics;
- photo gallery.

### 5.4 RSVPs

Champs documentés:

- `id`;
- `member.name`;
- `member.email` dans les exemples Meetup Pro.

Champs à découvrir:

- RSVP response/status;
- guests;
- createdAt/updateAt;
- attendance/no-show;
- waitlist;
- member id;
- member profile URL;
- member join date.

### 5.5 Réponses aux formulaires d'inscription

Champs documentés:

- `answers { question answer }`.

Champs à découvrir:

- event id;
- member id/email/name;
- RSVP id;
- answer id;
- question id;
- timestamps.

### 5.6 Photos

Champs documentés:

- `PhotoInfo.id`;
- `PhotoInfo.baseUrl`.

Fonctions attendues:

- sauvegarder les métadonnées photo;
- reconstruire les URLs en `jpg` et `webp` avec tailles configurables;
- téléchargement binaire optionnel en extension future.

## 6. Modes privacy

### 6.1 `full`

Conserve toutes les données accessibles. À utiliser pour archive privée uniquement.

### 6.2 `no-email`

Supprime ou vide les champs email dans les exports dérivés CSV/Markdown. Le JSON brut peut rester complet si `--raw-privacy full`, sinon il doit aussi être filtré.

### 6.3 `pseudonymized`

Remplace les identifiants membres et emails par des hash stables salés.

Exemple:

```text
member_91dd5c12
```

### 6.4 `public-archive`

Génère uniquement les données publiables:

- événements;
- dates;
- descriptions;
- hosts publics;
- liens publics;
- photos d'événement si usage autorisé;
- pas d'emails;
- pas de liste de participants;
- pas de réponses aux formulaires.

## 7. Parcours utilisateur

### 7.1 Vérifier l'accès

```bash
meetup-exit verify-auth --auth jwt-bearer ...
```

Résultat:

- identité `self`;
- endpoint GraphQL;
- expiration du token si connue;
- succès/échec clair.

### 7.2 Vérifier le réseau Pro

```bash
meetup-exit probe-network --network elsassjug
```

Résultat:

- réseau trouvé;
- nombre de groupes si accessible;
- exemples de groupes;
- droits insuffisants si échec.

### 7.3 Export complet

```bash
meetup-exit export \
  --network elsassjug \
  --out ./exports/meetup-2026-05-08 \
  --include-groups \
  --include-events \
  --include-rsvps \
  --include-registration-answers \
  --privacy-mode full
```

Résultat:

- `manifest.json`;
- `raw/*.jsonl`;
- `csv/*.csv`;
- `markdown/events/*.md`;
- `reports/export-summary.md`;
- `reports/gdpr-review.md`.

### 7.4 Générer seulement une archive publique

```bash
meetup-exit convert \
  --input ./exports/meetup-2026-05-08 \
  --out ./public-archive \
  --privacy-mode public-archive \
  --formats markdown
```

## 8. Règles fonctionnelles

### 8.1 Conservation du brut

Toute donnée récupérée depuis Meetup doit être conservée telle quelle dans `raw/*.jsonl`, sauf si l'utilisateur choisit explicitement un mode qui filtre aussi le brut.

### 8.2 Non-perte

Une transformation CSV/Markdown ne doit jamais être la seule version d'une donnée.

### 8.3 Idempotence

Relancer un export dans le même dossier avec `--resume` ne doit pas dupliquer les lignes JSONL. Le MVP peut utiliser un index local simple par `(entityType, sourceId, parentIds)`.

### 8.4 Traçabilité

Chaque record doit porter:

- `source`;
- `exportedAt`;
- `entityType`;
- `sourceId`;
- `parentIds`;
- `raw`.

### 8.5 Robustesse

Si un événement échoue, l'export doit continuer sur les autres événements, enregistrer l'erreur, puis retourner un code de sortie non-zéro si des erreurs critiques existent.

### 8.6 Pas de mutation

Aucune mutation GraphQL ne doit être appelée dans le MVP.

## 9. Sorties attendues

Voir `06-archive-format.md`.

## 10. Critères de succès

- Un organisateur peut produire une archive complète en une commande.
- L'archive peut être relue sans accès à Meetup.
- Les données sensibles sont identifiables.
- Les CSV peuvent être ouverts dans un tableur.
- Les Markdown peuvent alimenter un site statique.
- Le code peut être réutilisé comme lib TS.