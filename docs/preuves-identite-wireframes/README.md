# Captures de la reprise de l’identité visuelle

Les captures de ce dossier proviennent de Chromium local, NestJS et PostgreSQL local, avec des comptes/données fictifs. Elles ne représentent pas les données privées de LEYISA et ne prouvent pas un nouveau déploiement Vercel.

- Avant : vues déjà conservées au commit `c0fda69`, dans [preuves-espaces-v1/apres](../preuves-espaces-v1/apres/). Ces captures antérieures montrent la direction remplacée ; les données locales ont évolué avec les tests.
- Après : [31 vues](apres/captures.json), fichiers `apres/D-ADM.png` à `apres/W27.png`, incluant W01 et les quatre accueils. `parcours/` contient les états effectivement sélectionnés, les captures mobiles et les cinq PDF téléchargés pendant les tests.
- [57 tests backend](verification/backend-57.txt), [36 tests Playwright](verification/playwright-36.txt) puis [4 tests ciblés de session/PDF](verification/sessions-ciblees-4.txt), builds et lint dans `verification/`.
- [Constats, portée et contre-audit](../IDENTITE_WIREFRAMES_ET_RECETTE_LEYISA.md).

Le lecteur PDF n’est pas remplacé par un fac-similé HTML. Les tests vérifient que l’aperçu et le téléchargement contiennent les mêmes octets PDF. Aucun original pédagogique contenant des identités réelles n’a été ajouté à ces preuves.
