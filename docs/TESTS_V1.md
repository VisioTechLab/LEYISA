# Tests exécutés sur LEYISA SCHOOL V1

La recette du 19 novembre 2026 a utilisé Node 24.22.1, PostgreSQL 18.7 en loopback et Chromium 156, avec des comptes et données synthétiques. [Journal des lots et SHA](JOURNAL_INTEGRATION_V1.md)

| Contrôle | Résultat observé |
| --- | --- |
| Installation des deux lockfiles, validation/génération Prisma, TypeScript/Vite et lint | Exécutés et réussis. |
| Suite backend avec LEYISA_V1_TESTS=1 | **76 réussis, 0 échec, 0 ignoré** sur une base vierge migrée et un rôle runtime. [Bilan](preuves/logs/resultat-tests-v1.txt) |
| db:verify et db:check-access | **39 contrôles** réussis, transaction annulée. Rôle runtime vérifié en lecture seule. |
| Prisma migrate deploy/status/diff, pg_dump et pg_restore | Six migrations fraîches et mise à niveau 3→6. Diff vide et trois empreintes de snapshots et de documents conservées. [Preuves](preuves/logs/) |
| npm audit des deux applications, check-release.mjs et git diff --check | Contrôles réussis dans la CI. Scan à motifs des sources et du bundle client. [CI](https://github.com/VisioTechLab/LEYISA/actions?query=branch%3Aintegration%2Fleyisa-v1-cloud) |
| Chromium | 31 captures, deux petites largeurs sur W08 et parcours complet. Persistance des notes, du statut et du PDF après redémarrage de NestJS. [Parcours](preuves/browser.json) · [Empreintes](preuves/persistence.json) |
| PDF générés | Trois cycles et repêchage depuis les instantanés publiés. Contenu vérifié par extraction de texte, rendu visuel, comparaison des totaux et contrôle de la marque DEMO-V1. [Exemples](preuves/) |
| Relais Render/Vercel | Tests locaux de santé, filtrage d’en-têtes, cookies, PDF et refus d’accès direct. Vérification hébergée en attente. |
| GitHub Actions | [Contrôle du socle](https://github.com/VisioTechLab/LEYISA/actions/runs/44544558337) et [premier run applicatif](https://github.com/VisioTechLab/LEYISA/actions/runs/44545644139) réussis. Les exécutions par SHA sont accessibles sur la branche. |

## Matrice sécurité

| ID | Preuve |
| --- | --- |
| T01–T03 | Connexion valide, cookie opaque et refus générique identique pour mauvais mot de passe ou compte inconnu. |
| T04–T07 | Limitation persistante, cookie HTTPS, empreinte SHA-256 seule et expiration/révocation. |
| T08 | Refus sans jeton, Origin incorrect ou jeton mal formé. La lecture CSRF sur un autre onglet préserve le premier. |
| T09–T10 | Attribution de rôle refusée et accès hors classe refusé. Les anciennes inscriptions hors affectation restent masquées, y compris par filtre. |
| T11–T13 | Scan de secrets et stockage Web vide. Révocation et audit lors de la modification de rôle. Panne PostgreSQL contrôlée et réponse API générique. |
| T14–T16 | Refus d’auto-validation, double inscription concurrente atomique et runtime sans DDL. |
| T17 | Bulletin propre autorisé au service et celui d’autrui refusé. Connexion ELEVE inactive. |
| T18 | Publication prématurée refusée, blocage d’incomplets, séparation CLOSED/PUBLISHED. |

La suite vérifie également le dernier ADM en concurrence, les dates des cycles, la note zéro, les versions concurrentes, les cas 30/40, 10/40, 66/80 et 280/350, la deuxième session et la conservation de la première. Les captures documentent la recette visuelle. [Conformité des 31 vues](CONFORMITE_WIREFRAMES_V1.md)

Pour reproduire les tests, utiliser un PostgreSQL jetable déjà migré et alimenté, un compte runtime limité, LEYISA_V1_TESTS=1 et le fichier privé des identifiants du seed. Les tests écrivent dans leur propre jeu local. [Guide](PARCOURS_DEMO_V1.md)
