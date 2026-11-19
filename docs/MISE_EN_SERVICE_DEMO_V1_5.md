# Mise en service de la démonstration V1.5

## État vérifié le 19 novembre 2026

| Composant | État |
| --- | --- |
| Candidat Git | `demo/leyisa-v1` pointe vers `7783483d59e5f64f5d7e9e54ecb609a28be4e9a3`. Les deux exécutions de CI sont vertes. La PR #8 est en brouillon et sans revue GitHub. |
| Neon | Projet Free dédié **LEYISA School Demo V1**, région Frankfurt, PostgreSQL 18. Branche par défaut `demo-v1`, base `leyisa_demo` et rôle propriétaire `leyisa_demo_owner`. Le contrôle catalogue confirme zéro objet public et aucun registre de migration. |
| Render | `leyisa-nestjs.onrender.com` répond en HTTPS. `/health` renvoie un message texte et les routes attendues `/api/v1/auth/csrf` et `/api/v1/bulletins` renvoient 404. L’autorisation du compte Render est requise pour confirmer la configuration et déployer V1.5. |
| Vercel | L’accès au tableau de bord n’a pas été établi. La voie retenue pour les essais personnels non commerciaux est un projet Hobby avec déploiement manuel. |
| Recette | Restauration locale intégrale vérifiée. Les URL de démonstration et la recette hébergée restent à valider. |

Le feu vert de Melvin a été transmis par le demandeur pour la mise en ligne isolée. La revue humaine de la PR demeure nécessaire pour fusionner. L’accès PostgreSQL direct à la cible portée par le point d’accès Neon est refusé en TCP 5432 depuis l’environnement de préparation. Le point d’accès WebSocket répond, mais refuse la négociation TLS native de PostgreSQL. Le test s’est arrêté avant l’authentification. L’import et l’attribution des droits distants restent à exécuter depuis un poste habilité.

[CI et bundle récupérable](https://github.com/VisioTechLab/LEYISA/actions/runs/44574188498) · [PR #8](https://github.com/VisioTechLab/LEYISA/pull/8)

## 1. Neon — import et contrôle

1. Dans la console Neon, sélectionner le projet **LEYISA School Demo V1**, puis **Branches → demo-v1 → Connect**. Choisir `leyisa_demo`, le rôle `leyisa_demo_owner` et **Direct connection**. Identifier le nom du point d’accès direct dans la console. Charger la chaîne depuis le coffre dans l'environnement d’exécution approuvé, sans l’afficher. Utiliser TLS avec validation du nom du serveur.
2. Depuis un poste habilité à joindre ce point d’accès en TCP 5432, ouvrir une session directe et vérifier le projet, la branche, `current_database()`, `current_user`, PostgreSQL 18, l’absence d’objets publics et l’extension `btree_gist`. Les branches de développement appartiennent au projet **LEYISA**, distinct de cette cible.
3. Vérifier l’empreinte du fichier de sauvegarde transmis via le coffre. Le jeu a été produit par le seed et les parcours publiés, avec des données fictives et sans sessions à l’export. Enregistrer les références du changement et l’heure du créneau MOC avant l’import.
4. Restaurer sur la base vierge par `pg_restore --single-transaction --exit-on-error --no-owner --no-acl` en utilisant la connexion directe propriétaire. Le dump contient déjà le schéma et le registre des six migrations. Sur ce mode d’initialisation, exécuter ensuite `LEYISA_DB_MODE=shared npm run db:status --prefix backend`, avec `DIRECT_DATABASE_URL` disponible seulement pour la commande. Une initialisation vide par `db:migrate` suivie d’une importation de données dédiée est une procédure distincte. [Procédure de référence](DEPLOIEMENT_V1.md)
5. Appliquer `backend/prisma/access/shared-runtime.sql` avec le propriétaire. Créer par SQL un login dédié avec un mot de passe du coffre, membre du seul rôle `leyisa_runtime`, sans `CREATEDB`, `CREATEROLE` ni appartenance à `neon_superuser`. Dans **Neon → Connect**, sélectionner ce login et **Pooled connection**. Vérifier `sslmode=verify-full` puis les droits avec `npm run db:check-access --prefix backend` sur cette seule connexion runtime. La chaîne propriétaire reste séparée.

La restauration locale vérifiée contient 84 utilisateurs fictifs, 21 élèves, 105 résultats publiés, zéro session à l’export, zéro compte élève actif et six migrations appliquées. Les évaluations comprennent un brouillon, une soumission en attente, un rejet et des évaluations validées. `DEMO-LIVE / P1` reste ouverte. Les cinq PDF ont été téléchargés et comparés après deux démarrages du backend local.

Le dump et les comptes peuvent aussi être régénérés sur le poste de migration depuis le SHA du candidat. Avec PostgreSQL 18 en loopback et une base jetable, suivre le seed et les privilèges runtime de [MIGRATIONS_V1.md](MIGRATIONS_V1.md), puis lancer les trois parcours publiés avec le runtime local.

```sh
LEYISA_V1_TESTS=1 node --test   --test-name-pattern='Parcours réel|Bulletin CTEB|Deuxième session DEMO'   backend/test/v1.integration.test.mjs
```

Exporter au format custom PostgreSQL avec `--no-owner --no-acl` et exclure les données des tables `Session` et `LoginLimit`. Restaurer ce dump une fois dans une base locale vierge, contrôler son empreinte et conserver séparément le fichier des comptes généré par le seed. La sauvegarde privée de préparation inclut en plus des évaluations de présentation en brouillon, en attente et rejetées.


## 2. Réglages des deux hébergeurs

| Service et menu | Champ et valeur |
| --- | --- |
| Vercel, **Team Settings → Billing** | Confirmer le périmètre personnel Hobby et l’usage non commercial de la démo. |
| Vercel, **Project Settings → Build and Deployment** | Projet réservé aux essais. Le dossier exporté `frontend` constitue la racine du projet. Framework Vite et Node.js 24.x. Le fichier `vercel.json` fixe les autres paramètres. |
| Vercel, **Project Settings → Deployment Protection** | Activer **Vercel Authentication → All Deployments** avant le premier déploiement. Accorder l’accès par déploiement aux destinataires nominatifs et vérifier ce réglage avant diffusion. Relever l’origine HTTPS publique de ce déploiement. |
| Render, **Dashboard → leyisa-nestjs → Settings** | Vérifier que le service peut être réservé à cette démonstration et que ses réglages actuels permettent un retour. Dépôt `VisioTechLab/LEYISA`, branche `demo/leyisa-v1`, **Root Directory** = `backend`, **Auto-Deploy** = Off, **Health Check Path** = `/health`. Pour un service neuf, confirmer explicitement l’option **Free** avant de créer la ressource. |
| Render, **Settings → Build & Deploy** | **Build Command** = `npm ci --include=dev && npm run db:validate && npm run build`. **Start Command** = `npm start`. Pour réutiliser le service, appliquer à la main les valeurs du Blueprint et la branche démo. |
| Render, **Environment** | `NODE_VERSION=24.22.1`, `NODE_ENV=production`, `HOST=0.0.0.0`, `LEYISA_DEPLOYMENT=render`, `LEYISA_DB_MODE=shared`. `APP_ORIGINS` contient l’origine Vercel exacte sans slash. `DATABASE_URL` contient uniquement la chaîne runtime pooled. `LEYISA_PROXY_SECRET` est stocké dans le coffre. |
| Render, **Deploys → Manual Deploy → Deploy a specific commit** | Saisir `7783483d59e5f64f5d7e9e54ecb609a28be4e9a3`. Vérifier le SHA affiché et la réponse TLS de `/health` avant d’activer le frontend. |
| Vercel, **Project Settings → Environment Variables** | `LEYISA_RENDER_ORIGIN` = origine HTTPS Render exacte. `LEYISA_PROXY_SECRET` = la même valeur générée de 32 octets encodés en hexadécimal, stockée côté serveur sur les deux plateformes. |
| Vercel, **Deployments** | Déployer par la CLI l’export du SHA V1.5 et l’identifier avec la métadonnée `leyisaSourceSha`. Utiliser l’URL exacte du déploiement protégé. Vérifier côté navigateur que le relais bénéficie de la même origine et que le cache des réponses API est privé. |

Le propriétaire a retenu Vercel Hobby pour les tests personnels non commerciaux. La CLI Vercel accepte un dossier local sur un projet sans connexion Git. Render Free est une offre de prévisualisation qui peut se mettre en veille après 15 minutes d’inactivité. Contrôler le réveil et la durée réelle d’une première requête PDF à froid. [Vercel Fair Use](https://vercel.com/docs/limits/fair-use-guidelines) · [Vercel Pro](https://vercel.com/docs/plans/pro-plan) · [Protection Vercel](https://vercel.com/docs/deployment-protection) · [Render Free](https://render.com/docs/free) · [Déploiement par SHA sur Render](https://render.com/docs/deploys)

### Export Vercel vérifié

Depuis un clone du dépôt ayant récupéré le candidat, exporter le seul frontend dans un répertoire vide et compiler avec Node.js 24. La CI du SHA et le build de cet export autonome ont été vérifiés. L’archive ne contient ni métadonnées Git, ni dépendances installées, ni paramètres secrets.

```sh
sha=7783483d59e5f64f5d7e9e54ecb609a28be4e9a3
dossier=$(mktemp -d)
git archive "$sha:frontend" | tar -xf - -C "$dossier"
(cd "$dossier" && npm ci && npm run build)
```

Sur le projet Hobby authentifié et protégé, lier le dossier exporté au projet Vercel par `vercel link --cwd "$dossier"`. Après mise en place du relais et de ses variables, déployer via `vercel deploy --cwd "$dossier" --meta "leyisaSourceSha=$sha"`. Vercel peut classer le premier déploiement du projet en production. Le réglage **All Deployments** protège aussi cette URL. [Déploiement sans liaison Git](https://vercel.com/docs/deployments#vercel-cli) · [Protection gratuite de tous les déploiements](https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan)

## 3. Recette hébergée avec Melvin

- Ouvrir l’URL protégée en navigateur invité et vérifier le refus hors liste. Avec le compte de chaque rôle, se connecter, recharger la page, vérifier les droits et se déconnecter. Contrôler les attributs `HttpOnly`, `Secure`, `SameSite=Lax` et le refus CSRF. Tester la même URL sur téléphone et ordinateur.
- Suivre la classe `DEMO-LIVE / DEMO-2025-2026 / P1`. ADM consulte configuration et comptes. SEC crée et inscrit un élève fictif. ENS saisit zéro sur un cours et soumet. DIR rejette, puis valide la correction et le second cours avec leurs comptes distincts. DIR clôture et publie. SEC télécharge après publication. [Scénario détaillé](PARCOURS_DEMO_V1.md)
- Sur l’URL hébergée, télécharger les cinq PDF de démonstration et vérifier que chaque fichier porte `DEMO-V1`. Contrôler les refus hors rôle et avant publication, le refus d’accès direct à l’API Render et la persistance après redémarrage et réveil. Relever les SHA, URL, codes HTTP et anomalies de console sans enregistrer de secrets. [Cinq PDF et comparatifs attendus](AUDIT_BULLETINS_V1.md#rendus-complets)
- Distribuer les comptes fictifs ADM, SEC, ENS et DIR au moyen du coffre de Visio Tech, avec partage nominatif et expiration. Pour le scénario à deux cours, partager aussi le second compte ENS avec le testeur prévu. Distribuer aux testeurs uniquement le rôle requis. Le fichier local privé est séparé du dump et des preuves.

## 4. Retour arrière et restitution

Suspendre la saisie et révoquer les accès de présentation avant la bascule. Si une version hébergée précédente est compatible avec le schéma, rétablir ensemble le SHA Render et le déploiement Vercel correspondant. Conserver les sauvegardes et les références de chaque déploiement. Pour un retour touchant au schéma, restaurer le dump vérifié sur une nouvelle cible isolée, vérifier migrations, droits, compteurs et ouverture des PDF, puis faire approuver la bascule par Melvin. Un incident de session ou de relais impose la révocation des sessions et la rotation coordonnée des secrets. [Conservation et retour](MIGRATIONS_V1.md)

**Verdict** — Démonstration locale validée sous réserves. Démonstration en ligne en attente de l’import direct et de l’accès aux hébergeurs. Exploitation scolaire réelle soumise à la validation des règles pédagogiques et de la recette en établissement.
