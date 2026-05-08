# Meetup Exit — Spécifications fonctionnelles et techniques

Version: 0.1  
Date: 2026-05-08  
Statut: prêt pour lancement développement MVP

## Objectif

`meetup-exit` est un outil/lib TypeScript pour exporter les données d'un réseau Meetup Pro avant une sortie de plateforme, sans dépendre d'un export manuel incomplet.

Le produit cible n'est pas un SDK Meetup généraliste. C'est un outil de souveraineté de données:

- récupérer les données disponibles via l'API GraphQL Meetup;
- conserver les réponses brutes en JSONL;
- générer des exports CSV/Markdown/HTML exploitables;
- produire un manifeste d'audit;
- aider à identifier les données personnelles et les risques RGPD;
- permettre de relancer l'export de manière reproductible tant que l'abonnement/API est actif.

## Documents inclus

- `01-functional-spec.md`: spécifications fonctionnelles complètes.
- `02-technical-spec.md`: architecture technique TypeScript.
- `03-api-meetup-graphql.md`: synthèse des capacités GraphQL Meetup à utiliser.
- `04-authentication.md`: stratégie OAuth 2 / JWT bearer / refresh token.
- `05-rate-limit-and-retry.md`: stratégie Bottleneck, retry et coûts estimés.
- `06-archive-format.md`: formats de sortie, JSONL, CSV, Markdown, manifest.
- `07-cli-spec.md`: commandes CLI et options.
- `08-privacy-gdpr.md`: cadrage RGPD et modes privacy.
- `09-backlog.md`: découpage MVP et tickets.
- `10-acceptance-tests.md`: critères d'acceptation et scénarios de test.
- `11-project-bootstrap.md`: structure de repo, dépendances, conventions.
- `12-open-questions.md`: points à valider au premier accès API réel.
- `sources.md`: références utilisées.

## Décision d'architecture principale

Le chemin principal d'authentification est le flow OAuth 2 JWT Bearer documenté par Meetup:

```text
OAuth Client + RSA signing key
        -> signed JWT assertion
        -> POST https://secure.meetup.com/oauth2/access
        -> access_token
        -> GraphQL Authorization: Bearer access_token
```

L'outil doit aussi accepter un access token direct pour debug et un refresh token flow pour compatibilité.