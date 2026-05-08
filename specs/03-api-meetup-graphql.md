# 03 — API Meetup GraphQL à exploiter

## 1. Endpoint

Endpoint GraphQL:

```text
https://api.meetup.com/gql-ext
```

## 2. Authentification des requêtes

Header:

```http
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json
```

La doc montre aussi `Authorization: bearer {ACCESS_TOKEN}` sur la page auth. Le client doit utiliser `Bearer`, plus standard, et permettre de changer si nécessaire.

## 3. Vérification token

```graphql
query Self {
  self {
    id
    name
  }
}
```

Optionnel si disponible:

```graphql
query SelfWithEmail {
  self {
    id
    name
    email
  }
}
```

## 4. Pagination

Meetup utilise une pagination cursor-based.

Pattern:

```graphql
pageInfo {
  endCursor
}
edges {
  node {
    id
  }
}
```

Le cursor suivant est passé dans `after`.

Règle technique:

- le paginator doit s'arrêter si `endCursor` est null/undefined;
- il doit s'arrêter si `edges` est vide;
- il doit détecter les boucles de cursor.

## 5. Groupes d'un Pro Network

Query documentée:

```graphql
query ProGroups($urlname: ID!, $first: Int!, $cursor: String) {
  proNetwork(urlname: $urlname) {
    groupsSearch(input: { first: $first, after: $cursor, filter: {} }) {
      totalCount
      pageInfo {
        endCursor
      }
      edges {
        node {
          id
          name
          urlname
          memberships {
            totalCount
          }
        }
      }
    }
  }
}
```

Note: si GraphQL refuse `after: null`, générer deux queries ou construire l'input sans `after`.

## 6. Événements du Pro Network

Query documentée pour upcoming:

```graphql
query ProEvents($urlname: ID!, $first: Int!, $cursor: String, $status: String!) {
  proNetwork(urlname: $urlname) {
    eventsSearch(input: { first: $first, after: $cursor, filter: { status: $status } }) {
      totalCount
      pageInfo {
        endCursor
      }
      edges {
        node {
          id
          title
        }
      }
    }
  }
}
```

Statuts à valider par introspection:

- `UPCOMING` documenté;
- `PAST` probable;
- `DRAFT` à vérifier;
- `CANCELLED` à vérifier.

Le CLI doit permettre:

```bash
--event-status UPCOMING --event-status PAST
```

Et un raccourci:

```bash
--all-event-statuses
```

qui utilise les valeurs validées dans le schéma.

## 7. Détail événement

Query documentée:

```graphql
query EventDetails($eventId: ID!) {
  event(id: $eventId) {
    title
    eventUrl
    description
    dateTime
    duration
    eventHosts {
      memberId
      name
    }
    featuredEventPhoto {
      id
      baseUrl
    }
    group {
      id
      name
      urlname
    }
    rsvps {
      edges {
        node {
          id
          member {
            name
          }
        }
      }
    }
  }
}
```

Pour le design, séparer `EventDetails` et `EventRsvps` si l'introspection confirme une pagination plus fine sur `rsvps`.

## 8. RSVPs

Exemple documenté via `eventsSearch`:

```graphql
query ProEventRsvps($urlname: ID!) {
  proNetwork(urlname: $urlname) {
    eventsSearch(input: { first: 3, filter: { status: "UPCOMING" } }) {
      totalCount
      pageInfo {
        endCursor
      }
      edges {
        node {
          id
          rsvps {
            edges {
              node {
                id
                member {
                  name
                  email
                }
              }
            }
          }
        }
      }
    }
  }
}
```

À vérifier par introspection:

- `rsvps(input: ...)` ou `rsvps(...)`;
- filtres RSVP;
- `totalCount` sur `rsvps`;
- pagination des RSVPs;
- champs `response`, `guests`, `createdAt`, `updatedAt`, `attendance`.

## 9. Réponses aux formulaires RSVP

Query documentée:

```graphql
query EventRegistrationAnswers($urlname: ID!, $eventId: ID!) {
  proNetwork(urlname: $urlname) {
    eventRegistrationAnswers(input: { filter: { eventIds: [$eventId] } }) {
      totalCount
      edges {
        node {
          answers {
            question
            answer
          }
        }
      }
    }
  }
}
```

À vérifier:

- pagination;
- champs d'association vers RSVP/member/event;
- présence d'email ou member;
- timestamps.

## 10. Photos

Champs documentés:

```graphql
featuredEventPhoto {
  id
  baseUrl
}
```

Fonction de construction URL:

```ts
export function buildMeetupPhotoUrl(input: {
  baseUrl: string;
  id: string;
  width: number;
  height: number;
  format: "jpg" | "webp";
}): string {
  return `${input.baseUrl}${input.id}/${input.width}x${input.height}.${input.format}`;
}
```

À valider avec photos réelles, car les formats exacts peuvent varier selon type de photo.

## 11. Introspection

La doc Meetup indique que la nouvelle API GraphQL de février 2025 supporte l'introspection complète.

Commande attendue:

```bash
meetup-exit introspect --out schema/introspection.json
```

La première étape de développement après obtention token doit être:

1. `verify-auth`;
2. `probe-network`;
3. `introspect`;
4. codegen;
5. ajustement des queries.

## 12. Mutations

Meetup documente des mutations de création/édition d'événements, mais elles sont hors périmètre. Le projet doit interdire les mutations dans le MVP.

Règle de sécurité:

- seules les opérations GraphQL commençant par `query` sont autorisées par défaut;
- toute mutation doit nécessiter un flag futur explicite, inexistant en MVP.