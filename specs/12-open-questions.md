# 12 — Questions ouvertes à valider avec un compte Meetup Pro réel

## 1. Auth

- Le JWT Bearer Flow est-il accepté immédiatement avec le client OAuth Pro disponible?
- Le `AUTHORIZED_MEMBER_ID` attendu est-il le numeric id visible via `self.id`?
- Le token response retourne-t-il toujours un `refresh_token` dans le JWT flow?
- Les erreurs exactes en cas de clé/signing key invalide sont-elles stables?

## 2. Schéma GraphQL

À vérifier par introspection:

- type exact de `Event.status`;
- valeurs possibles pour `eventsSearch.filter.status`;
- pagination exacte de `event.rsvps`;
- champs disponibles sur `Rsvp`;
- champs disponibles sur `Member`;
- visibilité réelle de `member.email`;
- association `eventRegistrationAnswers` -> member/rsvp/event;
- champs venue/location;
- champs event type online/in-person/hybrid;
- champs photo gallery au-delà de `featuredEventPhoto`.

## 3. Données historiques

- L'API retourne-t-elle tous les événements passés ou seulement une fenêtre?
- Les RSVPs historiques sont-ils conservés?
- Les emails historiques restent-ils accessibles?
- Les réponses formulaires historiques restent-elles accessibles?

## 4. Permissions

- Différence entre owner réseau Pro, organizer groupe, co-organizer?
- Accès emails selon groupe/réseau?
- Accès registration answers selon event/group?

## 5. Rate limit

- Les `consumedPoints` sont-ils exposés uniquement en erreur ou aussi en headers/extensions?
- Les coûts varient-ils selon champs demandés?
- Un export full historique déclenche-t-il une surveillance spécifique?

## 6. Photos

- La construction URL `baseUrl + id + dimensions + format` fonctionne-t-elle pour tous les types de photo?
- Quelles tailles sont acceptées?
- Y a-t-il des restrictions de téléchargement?

## 7. RGPD / usage

- Quel consentement existe côté Meetup pour réutiliser les emails hors plateforme?
- Quelles données doivent être supprimées avant publication d'une archive publique?
- Les anciennes réponses libres peuvent-elles contenir des données sensibles à filtrer manuellement?

## 8. Décision après validation

Après introspection et test sur un réseau réel, mettre à jour:

- queries GraphQL;
- CSV columns;
- privacy classifier;
- backlog MVP.