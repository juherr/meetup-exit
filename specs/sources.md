# Sources

## Meetup

- Meetup GraphQL Authentication & Security  
  https://www.meetup.com/graphql/authentication/

- Meetup GraphQL Guide  
  https://www.meetup.com/graphql/guide/

- Meetup GraphQL Introduction  
  https://www.meetup.com/graphql/

## Librairies proposées

- Bottleneck — job scheduler and rate limiter  
  https://github.com/SGrondin/bottleneck

- graphql-request  
  https://www.npmjs.com/package/graphql-request

- jose  
  https://www.npmjs.com/package/jose

- GraphQL Code Generator — TypeScript graphql-request plugin  
  https://the-guild.dev/graphql/codegen/plugins/typescript/typescript-graphql-request

## Points retenus

- Meetup GraphQL utilise `https://api.meetup.com/gql-ext`.
- L'authentification des requêtes GraphQL se fait avec `Authorization: Bearer {ACCESS_TOKEN}`.
- Meetup documente OAuth 2, Server Flow, Refresh Token Flow, JWT Flow et Implicit Flow.
- Le JWT Flow est adapté au server-to-server sans interaction membre, mais limité au propriétaire de l'OAuth Client.
- Le refresh token est single-use.
- La pagination Meetup GraphQL est cursor-based via `pageInfo.endCursor`.
- Meetup documente `proNetwork(...).groupsSearch`, `eventsSearch`, `event(id)`, `rsvps`, `member.email` dans les exemples RSVP, et `eventRegistrationAnswers`.
- Meetup documente une erreur GraphQL `RATE_LIMITED` avec `consumedPoints` et `resetAt`.
- Meetup indique que depuis février 2025 la nouvelle API GraphQL supporte l'introspection complète du schéma.