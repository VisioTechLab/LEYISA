# Préparation du déploiement de démonstration

## État du 19 novembre 2026

Cette branche fournit un Blueprint Render et une configuration Vercel, avec un relais de même origine vers NestJS. Les manifestes sont chargés localement et les tests du relais vérifient les en-têtes, les cookies HTTPS, le téléchargement PDF et les refus. L’exécution sur les plateformes reste à valider. Aucune URL de démonstration n’est active.

Neon a été consulté en lecture seule. Le projet indiqué contient cinq branches, dont la branche de test historique. La branche `demo-v1` reste à créer après validation MOC et confirmation de la source vide. Les données de démonstration proviennent du seed local et des parcours publiés avec le moteur.

## Configuration prévue

| Composant | Réglages |
| --- | --- |
| Render | Appliquer [render.yaml](../render.yaml) depuis la branche d’intégration revue. Répertoire `backend`, Node 24.22.1, compilation verrouillée et contrôle `/health`. `PORT` est fourni par Render. Déclenchement manuel. |
| Render | `APP_ORIGINS` contient l’origine HTTPS exacte du projet Vercel retenu, sans slash final. `DATABASE_URL` désigne exclusivement le compte runtime limité sur le point d’accès pooled de `demo-v1`, avec `sslmode=verify-full`. |
| Vercel | Projet Vite, répertoire `frontend`, Node 24.x, déploiement manuel d’un candidat revu. [vercel.json](../frontend/vercel.json) applique les en-têtes de sécurité et route `/api/v1/*` vers la fonction serveur. Activer la protection d’accès de l’environnement de démonstration avant d’y donner accès. |
| Vercel | `LEYISA_RENDER_ORIGIN` contient l’origine HTTPS exacte du service Render en `onrender.com`. Fournir `LEYISA_PROXY_SECRET` sur les deux plateformes depuis le coffre. Générer la même valeur de 32 octets en hexadécimal par environnement. |
| Neon | Utiliser un point d’accès direct pour migrations et restaurations. Le compte propriétaire et `DIRECT_DATABASE_URL` restent dans l’environnement d’exécution des migrations approuvées. |

Le navigateur envoie les cookies et l’Origin à son propre domaine. La fonction Vercel transmet les seules valeurs nécessaires et le secret de liaison à Render par HTTPS. NestJS exige ce secret hors contrôle de santé et applique ensuite sa session, sa vérification CSRF et ses droits métier. Les cookies `HttpOnly`, `Secure`, `SameSite=Lax` restent limités à l’hôte public de la démo. L’adresse client utilisée par la limitation de tentatives est fournie par Vercel et acceptée par NestJS après authentification du relais. Les réponses API portent `private, no-store` via Vercel. Les variables du relais et le DSN restent côté serveur.

## Mise en service après autorisation

1. Faire relire la révision et les changements MOC. Choisir une branche `demo-v1` issue d’une source vide ou un projet démo neuf. Contrôler la région, l’identité du projet et du point d’accès, la version PostgreSQL, l’absence de données et le périmètre de sauvegarde.
2. Préparer PostgreSQL 18 local et vide avec les six migrations et le seed V1. Jouer les publications nécessaires via le moteur et relever les identifiants de démo depuis le fichier privé généré. Vérifier que toutes les lignes sont fictives.
3. Initialiser la base de démonstration approuvée depuis la sauvegarde contrôlée du jeu local, sur une base dédiée vierge. Préparer le dump local avec `pg_dump -Fc --no-owner --no-acl`. Vérifier son empreinte, puis utiliser `pg_restore --single-transaction --exit-on-error --no-owner --no-acl` sur le point d’accès direct de la cible validée. Tester la restauration et le statut des migrations avant d’ouvrir le service. Pour une initialisation sans données, appliquer les migrations Prisma depuis le compte propriétaire avec `LEYISA_DB_MODE=shared` et `DIRECT_DATABASE_URL`. Ces deux méthodes d’initialisation sont exclusives.
4. Attribuer les privilèges versionnés avec [shared-runtime.sql](../backend/prisma/access/shared-runtime.sql), créer un login runtime dédié et vérifier ses droits en lecture seule avec `npm run db:check-access --prefix backend`. Les comptes de démo sont transmis dans le coffre prévu.
5. Activer Render et Vercel pour le SHA revu. Vérifier les règles de réécriture de Vercel, le TLS des deux liaisons, la réponse minimale de santé, le refus d’un accès API direct Render et le refus d’un `Origin` différent. Sur l’origine Vercel, vérifier cookies, login/me/logout, chaîne de publication des trois cycles, PDF en téléchargement et persistance.
6. Inscrire SHA, URL vérifiée, résultat des contrôles et références de sauvegarde dans le journal. Pour le retour, rétablir l’artefact compatible précédent. Restaurer une base distincte et faire valider la bascule si le schéma diffère.

La restauration et le relais sont vérifiés localement. La revue humaine, la branche dédiée, l’activation du service, la vérification des URL et le contrôle de TLS hébergé sont des étapes ouvertes.

[Blueprint Render](https://render.com/docs/blueprint-spec) · [Fonctions Node.js Vercel](https://vercel.com/docs/functions/runtimes/node-js) · [Réécritures Vercel](https://vercel.com/docs/routing/rewrites) · [En-têtes de requête Vercel](https://vercel.com/docs/headers/request-headers) · [Connexions Neon](https://neon.com/docs/connect/choose-connection)
