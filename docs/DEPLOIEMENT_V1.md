# Préparation du déploiement sécurisé

État : application compilée et exécutée localement ; **aucun déploiement Internet effectué**, aucune URL de démo en ligne vérifiée. `deploy/nginx.conf` et `deploy/env.example` sont des gabarits à adapter à l'hébergement approuvé. La CI applicative est préparée ; son équivalent local est vérifié, aucun run GitHub de cette branche n'est revendiqué.

Artefacts : backend NestJS `backend/dist`, client Prisma généré `backend/generated`, dépendances de production et `prisma/reference-data.json` non servi ; frontend `frontend/dist`. Node>=24.7 pour Argon2id natif. Installer depuis lockfiles puis construire, ne pas embarquer le kit, fichiers .env, identifiants de seed, dumps ni preuves privées dans l'image publique.

Configuration : `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT`, `APP_ORIGINS=https://<domaine exact>` explicite, `LEYISA_DB_MODE=shared`, DATABASE_URL pooled TLS runtime limité au coffre. DIRECT_DATABASE_URL propriétaire seulement dans un job de migration approuvé, jamais dans frontend ou serveur HTTP. Rotation/remise des comptes nominatives hors Git. Pas d'identifiant ou mot de passe fixe dans le frontend.

Architecture prévue : navigateur HTTPS → reverse proxy même origine, fichiers statiques et `/api/v1`→backend privé ; `/health`→backend minimal. Terminaison TLS réelle requise, HTTP redirigé vers HTTPS par l'hébergeur, aucune exposition directe de PostgreSQL ni du backend à Internet. Cookies Secure en production, HttpOnly/SameSite=Lax/host-only ; APP_ORIGINS correspond au domaine. Tester CSP du proxy, en-têtes des réponses proxy et TLS après configuration réelle (gabarit non testé par nginx ici). Ne pas traiter le proxy HTTP local comme une validation TLS en ligne.

Séquence après approbation :

1. Lead et propriétaires revoient diff/contrats/MOC, branche et migrations. Push/PR/fusion uniquement autorisés ; main reste intact pour le présent travail.
2. Exécuter la CI GitHub définie dans `.github/workflows/v1.yml`, lire résultats et artefacts. Ne pas remplacer une CI distante manquante par une affirmation de réussite.
3. Créer environnement/branche Neon **dédiés** avec sauvegarde, accès séparés et accord de migration ; traiter divergence historique selon MIGRATIONS_V1.md.
4. Déployer les artefacts avec coffre, TLS et proxy même origine. Aucun seed fictif automatique sur partagé ; import synthétique dédié à approuver et revoir.
5. Vérifier `/health`, login/me/logout, cookie HTTPS, refus CSRF/Origin, droits/scopes directs, pas de DDL runtime, workflow trois cycles, PDF publié et persistance après redémarrage.
6. Enregistrer URL effectivement visitée, SHA déployé, résultats, backup et procédure de retour. Limiter l'accès à l'équipe/l'école pour la démo.

Retour : désactiver l'accès, revenir à l'artefact précédent compatible ; si schéma incompatible, restaurer sur branche distincte puis basculer avec autorisation. Aucun reset d'une base partagée. Les critères pédagogiques non confirmés et l'activation ELEVE restent des prérequis séparés à l'exploitation réelle.
