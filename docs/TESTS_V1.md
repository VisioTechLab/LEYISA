# Recette réelle V1 — 19 novembre 2026

> Les résultats décrits dans cette version sont les éléments historiques de la sauvegarde de travail. Voir le journal d’intégration pour les exécutions réalisées à la reprise.

Base initiale45b62052594526ada995abb9bb422d5951973372, branche integration/leyisa-v1. Les preuves sont versionnées sous `docs/preuves/`; leur manifeste indique les empreintes. Node24.22.3, PostgreSQL18.6 local, Chrome headless réel via Playwright1.62.1. Aucun test contre Neon ni donnée personnelle réelle. Le rapport d'audit identifie la révision finale.

## Exécutions

| Vérification | Résultat observé / portée |
|---|---|
| backend npm ci, prisma validate/generate, tsc ; frontend npm ci, TypeScript/Vite, oxlint | Builds exécutés ; journaux de compilation et lint. |
| Suite complète `LEYISA_V1_TESTS=1 node --test test/*.test.mjs` avec DB runtime locale neuve, six migrations et seed | Première recette candidate63/63 ; recette étendue69/69,0échec,0ignoré,113,9s. Les tests supplémentaires inventaire/CSRF ont une exécution ciblée séparée, voir journal final. |
| `npm run db:verify` |39 contrôles PostgreSQL réussis, transaction globale annulée. |
| `prisma migrate status` / `migrate diff` | Six migrations appliquées ; diff vide. |
| Mise à niveau trois→six migrations puis pg_dump/pg_restore sur base distincte | Trois snapshots : empreintes identiques avant/après/restauration ; trois anciens documents/notice préservés. |
| npm audit backend et frontend | Zéro vulnérabilité connue à l'exécution ; ne couvre pas défauts métier ni vulnérabilités non répertoriées. |
| `node backend/scripts/check-release.mjs` | Git diff check et motifs secrets/bundle vérifiés ; pas de token client, URL Neon secrète ou clé privée détectée. |
| Chrome1440×1000 et390/320px | Parcours par formulaires, validation/rejet/correction, rechargements, publication et téléchargement ; captures et journal dédiés. |
| PDF | Téléchargements authentifiés, comparaison JSON aux snapshots publiés, octets déterministes, pdftotext/pdftoppm et inspection visuelle des pages. |
| CI GitHub / nginx / déploiement en ligne | **Non exécutés** : branche non publiée, pas d'autorisation de déploiement. Workflow fourni et équivalent local, aucune prétention à un run distant réussi. |

Certaines commandes Node/sockets/sous-processus Git étaient refusées par le bac à sable ; elles ont été relancées avec l'autorisation technique locale et ont produit les résultats cités. Les premiers essais navigateur ont révélé noms accessibles et rafraîchissement de file ; corrigés, nouvelles preuves après reprise. Les échecs intermédiaires ne sont pas comptés comme succès.

## Sécurité T01–T18

| ID | Contrôle et preuve |
|---|---|
| T01 | Login réel, cookie opaque et profil minimal ; v1.integration/auth. |
| T02 | Mot de passe incorrect401 générique ; v1.integration. |
| T03 | Login inconnu et mdp incorrect réponses identiques ; v1.integration. |
| T04 | Compte/origine limités429, nouveau serveur Nest même DB toujours bloqué ; v1.integration. |
| T05 | Connexion HTTPS réelle avec certificat local vérifié par CA, Secure/HttpOnly/Lax/host-only/Path ; security.integration. Pas une preuve TLS de l'hébergeur. |
| T06 | DB conserve SHA256, jamais token brut ; v1.integration. |
| T07 | Expiration absolue8h, logout et révocation effectifs ; v1.integration/auth. |
| T08 | Absence jeton et Origin hostile403 ; CSRF non ASCII refusé et audit ; v1.integration/routes. |
| T09 | SEC→rolesADM refusé ; ADM→students et DIR→audit refusés ; v1.integration. |
| T10 | ENS autre classe404 et filtreclassId ne contourne pas scope ; v1.integration. |
| T11 | Scan sources/Git/bundle + localStorage/sessionStorage vides en navigateur. Scan à motifs, pas certification exhaustive. |
| T12 | Rôle/statut modifiés : sessions révoquées et audit avant/après persistant ; v1.integration. |
| T13 | PostgreSQL vraiment indisponible(port1) :503 sans SQL/stack/adresse ; security.integration. |
| T14 | ENS+DIR ne décide pas sa propre soumission, actorId forgé sans effet ; v1.integration + DB. |
| T15 | Dossier séparé, double inscription concurrente et rollback ; v1.integration/students. |
| T16 | Runtime sans DDL/accès migrations, audit sans UPDATE/DELETE ; DBverify + v1.integration. |
| T17 | Propre bulletin autorisé, autrui403 **au service** ; ELEVE reste désactivé, login élève E2E non exécuté et non revendiqué. |
| T18 | Publication avant clôture refusée ; absence validation/incomplets bloquent ; CLOSED séparé de PUBLISHED ; v1.integration. |

Dernier ADM : deux désactivations concurrentes conservent un ADM actif. Inventaire automatique des contrôleurs compilés : routes non publiques doivent déclarer permission/session ; nouvelle route non déclarée refusée par défaut. API directe vérifiée en plus des menus.

## Métier et permissions

US-A01/A02/A03 : C01 et ADM/audit ; US-S01/S02 : SEC création et ENS scope ; US-E01 : affectation, état, version, grille bornée et zéro ; US-R01 : DIR/SoD/clôture/publication ; US-B01 : publié et propriété. Voir contrats et matrices approuvées pour détails.

Tests métier réels :3cycles avec toutes périodes/examens/synthèses annuelles, rejet/correction et historique immuable, repêchage explicitement autorisé, moyennes à maxima inégaux, concurrence close/close et enroll/close, protection DB programme et snapshots, note manquante/absente/non applicable, double soumission/version périmée, années/classes incohérentes, prédicats calendaires et dates civiles Kinshasa.

Règles non confirmées : Les Ovations, compensation et maxima absents ne sont pas « testés conformes ». Le code retourne à examiner et conserve des décisions humaines motivées, sans modifier les notes historiques. Les tests des fixtures du skill Senior (3 réussis) sont séparés des tests applicatifs.

## Reproduction

Depuis backend : exporter DATABASE_URL runtime loopback d'une base neuve préalablement migrée/seedée ; LEYISA_DB_MODE=local, LEYISA_V1_TESTS=1, LEYISA_DEMO_CREDENTIALS_FILE vers fichier600, LEYISA_V1_PROOFS vers dossier hors secrets. Exécuter `npm test` puis `npm run db:verify`. Le workflow V1 décrit toute la préparation PostgreSQL et rôles. Ne pas utiliser NODE_ENV=production pour les fixtures, ne pas migrer Neon.

Limites de recette : pas d'essai de charge volumétrique, pas de campagne exhaustive clavier/lecteur d'écran pour chaque état de chaque écran, pas de pixel-diff automatique, aucun TLS/restore en environnement hébergé. Ces limites sont portées au verdict et à la matrice de conformité, pas masquées par le nombre de tests.
