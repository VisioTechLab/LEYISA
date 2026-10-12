# Équipe et propriété des modules

| Membre | Responsabilité officielle | Frontend et backend |
|---|---|---|
| Sidonie | Authentification, utilisateurs, rôles et audit | auth |
| Franck | Élèves, dossiers et inscriptions | students |
| Jonathan | Années, périodes, classes, matières et bulletins PDF | school, bulletins |
| Kevin | Enseignants, affectations et intégration | assignments |
| Joel | Évaluations, notes et soumissions | evaluations |
| Melvin | Validation, calculs, résultats et clôture | results |

Pour chaque domaine, le propriétaire travaille principalement dans `frontend/src/features/<domaine>/` et `backend/src/modules/<domaine>/`.

- Melvin : **lead technique**, validation de la stack et cohérence architecturale.
- Kevin : **intégration**, coordination Git, Docker, assemblage et suivi.
- Joel : **référent cybersécurité proposé**, en collaboration avec Sidonie sur les contrôles sensibles.
- Franck : **cohérence métier**, clarification des règles de gestion scolaire.
- Jonathan : **développement accompagné**, tâches petites et vérifiables.

Tout le monde peut lire les autres modules. Les modifier nécessite une coordination avec leur responsable. Les espaces shared/common, les modèles, migrations et contrats API ne sont pas des zones de modification libre. Les identifiants GitHub restent à confirmer pour CODEOWNERS ; ne pas les déduire des prénoms.

Les Skills correspondants se trouvent dans `.agents/skills/leyisa-<prenom>/SKILL.md`. Voir [README](../README.md) pour leur invocation.
