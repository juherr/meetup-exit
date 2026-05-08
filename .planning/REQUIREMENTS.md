# Requirements: meetup-exit

**Defined:** 2026-05-08
**Core Value:** Un admin Meetup Pro peut exécuter une commande et obtenir une archive complète et reproductible de ses données réseau.

## v1 Requirements

Requirements pour compléter le MVP. Le core (auth, GraphQL client, export, archive writers, privacy) est déjà validé.

### Convert

- [x] **CONV-01**: L'utilisateur peut re-dériver CSV/Markdown depuis un raw JSONL existant sans re-fetcher l'API (`convert --input <dir> --out <dir>`)

### Photos

- [ ] **PHOTO-01**: L'export inclut les métadonnées photos — `featuredEventPhoto` URL extraite, `csv/photos.csv` généré

### Resume

- [ ] **RESM-01**: L'utilisateur peut reprendre un export partiel avec `--resume` — index local à `.meetup-exit/index.json`, aucun doublon dans les fichiers archive

### Error Handling

- [ ] **ERR-01**: Les erreurs d'entités sont persistées dans `raw/errors.jsonl` et `reports/errors.md` — l'export continue sur les entités indépendantes, s'arrête sur auth failure

### Diagnostics

- [ ] **DIAG-01**: La commande `doctor` vérifie la version Bun, les vars d'environnement requises, les permissions de la clé privée, et la writabilité du répertoire de sortie

### Documentation

- [ ] **DOC-01**: README couvre le setup complet — création OAuth Client, configuration JWT bearer, exemple d'export complet, description des privacy modes
- [ ] **DOC-02**: `.env.example` liste toutes les variables MEETUP\_\* avec commentaires en anglais
- [ ] **DOC-03**: Security guide documente la gestion des tokens, private key, exports full, et configuration gitignore

## v2 Requirements

Reporté après le MVP.

### Archive

- **ARCH-01**: Export photos binaires (download des images, pas seulement les URLs)
- **ARCH-02**: Archive HTML générée depuis les Markdown

### Resilience

- **RESM-02**: Retry configurable par entité (actuellement global)
- **RESM-03**: Index de resume avec métadonnées (timestamp, durée par entité)

## Out of Scope

| Feature                           | Reason                                          |
| --------------------------------- | ----------------------------------------------- |
| Interactive prompts               | Spec constraint — no interactive prompts in MVP |
| Real-time sync / watch mode       | One-shot export uniquement                      |
| OAuth web flow (browser redirect) | JWT Bearer est le flow principal                |
| Node.js compatibility             | Bun uniquement                                  |

## Traceability

| Requirement | Phase   | Status  |
| ----------- | ------- | ------- |
| CONV-01     | Phase 1 | Complete |
| PHOTO-01    | Phase 2 | Pending |
| RESM-01     | Phase 2 | Pending |
| ERR-01      | Phase 2 | Pending |
| DIAG-01     | Phase 3 | Pending |
| DOC-01      | Phase 3 | Pending |
| DOC-02      | Phase 3 | Pending |
| DOC-03      | Phase 3 | Pending |

**Coverage:**

- v1 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0 ✓

---

_Requirements defined: 2026-05-08_
_Last updated: 2026-05-08 after initial definition_