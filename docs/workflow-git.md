# Workflow Git et protections

1. Créer une branche courte par fonctionnalité, depuis un `main` à jour : `feat/<domaine>-<tranche>` ou `fix/<domaine>-<sujet>`.
2. Aucun développement direct sur `main`. Le socle utilise `chore/bootstrap-leyisa`.
3. Ouvrir une Pull Request avant fusion et décrire les changements et vérifications.
4. Obtenir au moins une revue humaine par un autre membre ; ne pas fusionner sa propre PR sans cette revue.
5. Exécuter les tests concernés et les contrôles disponibles. Signaler explicitement ce qui n'a pas pu être testé.
6. Coordonner toute modification des modèles partagés, migrations et contrats API avec leurs responsables et Melvin pour les décisions techniques.
7. Aucun secret ou véritable mot de passe dans Git. Garder les configurations locales hors du dépôt.
8. Ne jamais écraser le travail d'un collègue, utiliser `push --force` ou supprimer ses fichiers. En cas de conflit, examiner les deux changements avec le responsable.

Exemple après clonage :

```sh
git switch main
git pull --ff-only
git switch -c feat/school-classes
# Développer la tranche convenue, puis vérifier les changements.
git diff --check
git add <fichiers-concernés>
git commit -m "feat(school): ajouter la tranche convenue"
git push -u origin feat/school-classes
```

## Protection de main

Au constat initial du 12 octobre 2026, `main` n'avait ni protection classique ni ruleset. Le compte utilisé disposait des droits d'administration.

Protection configurée et vérifiée via l’API GitHub le 12 octobre 2026 : PR obligatoire, une approbation, interdiction des force-push et de suppression de `main`, règles applicables aux administrateurs. Les approbations deviennent caduques après de nouveaux commits. Aucun contrôle de statut n’est obligatoire à ce stade. Une approbation doit provenir d'un autre humain selon notre procédure ; la protection seule ne certifie pas qu'un compte est humain.

Ne rendre aucun contrôle automatique obligatoire tant qu'il n'a pas réellement fonctionné. La CI du socle ne vérifie que les changements Git et les espaces en fin de ligne. Après une première exécution réussie et accord de l'équipe, l'administrateur pourra rendre `Contrôle du socle` obligatoire. Ajouter les tests applicatifs lorsque la stack sera validée et le code exécutable.

Si GitHub refuse la configuration, l'administrateur doit configurer ces règles dans Settings → Branches ou Rules → Rulesets, selon les fonctionnalités disponibles. Le compte rendu de livraison indique la configuration effectivement appliquée.

## CODEOWNERS

Les exemples sont commentés et ne protègent rien à ce stade. Recueillir les identifiants GitHub réels, vérifier leurs droits sur le dépôt, compléter les propriétaires, puis envisager la revue des propriétaires après validation de l'équipe. Ne pas activer cette exigence avec des propriétaires manquants.

Kevin coordonne Git et l'intégration. Une fusion exige la revue et les conditions réellement configurées ; la PR du socle ne doit pas être fusionnée sans autorisation du demandeur.
