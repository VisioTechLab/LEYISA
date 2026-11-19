# Recette visuelle des 31 vues

Avant : frontend `e0c49ff` dans un worktree détaché, avec proxy de capture local et cache distinct. Après : code `d5bb929`. Les deux utilisent les mêmes API/données fictives locales ; les sessions et événements d’audit évoluent pendant les captures. Les fichiers ne constituent pas une comparaison pixel à pixel avec les wireframes. Les droits des matrices sont conservés.

Les vues de lecture sont capturées après résolution de la navigation et disparition des chargements. Elles sont vérifiées à1440px et sans débordement global à390/320px. Les opérations réelles du parcours métier et les limites de couverture sont précisées dans le rapport.

| Vue | Rôle | Avant | Après | Mobile390 |
| --- | --- | --- | --- | --- |
| D-ADM | ADM | [Capture](avant/D-ADM.png) | [Capture](apres/D-ADM.png) | [Capture](apres/D-ADM-mobile-390.png) |
| D-SEC | SEC | [Capture](avant/D-SEC.png) | [Capture](apres/D-SEC.png) | [Capture](apres/D-SEC-mobile-390.png) |
| D-ENS | ENS | [Capture](avant/D-ENS.png) | [Capture](apres/D-ENS.png) | [Capture](apres/D-ENS-mobile-390.png) |
| D-DIR | DIR | [Capture](avant/D-DIR.png) | [Capture](apres/D-DIR.png) | [Capture](apres/D-DIR-mobile-390.png) |
| W01 | Tous | [Capture](avant/W01.png) | [Capture](apres/W01.png) | [Capture](apres/W01-mobile-390.png) |
| W02 | ADM | [Capture](avant/W02.png) | [Capture](apres/W02.png) | [Capture](apres/W02-mobile-390.png) |
| W03 | ADM | [Capture](avant/W03.png) | [Capture](apres/W03.png) | [Capture](apres/W03-mobile-390.png) |
| W04 | ADM | [Capture](avant/W04.png) | [Capture](apres/W04.png) | [Capture](apres/W04-mobile-390.png) |
| W05 | ADM | [Capture](avant/W05.png) | [Capture](apres/W05.png) | [Capture](apres/W05-mobile-390.png) |
| W06 | DIR | [Capture](avant/W06.png) | [Capture](apres/W06.png) | [Capture](apres/W06-mobile-390.png) |
| W07 | DIR | [Capture](avant/W07.png) | [Capture](apres/W07.png) | [Capture](apres/W07-mobile-390.png) |
| W08 | SEC | [Capture](avant/W08.png) | [Capture](apres/W08.png) | [Capture](apres/W08-mobile-390.png) |
| W09 | SEC | [Capture](avant/W09.png) | [Capture](apres/W09.png) | [Capture](apres/W09-mobile-390.png) |
| W10 | SEC | [Capture](avant/W10.png) | [Capture](apres/W10.png) | [Capture](apres/W10-mobile-390.png) |
| W11 | SEC | [Capture](avant/W11.png) | [Capture](apres/W11.png) | [Capture](apres/W11-mobile-390.png) |
| W12 | SEC | [Capture](avant/W12.png) | [Capture](apres/W12.png) | [Capture](apres/W12-mobile-390.png) |
| W13 | ENS | [Capture](avant/W13.png) | [Capture](apres/W13.png) | [Capture](apres/W13-mobile-390.png) |
| W14 | ENS | [Capture](avant/W14.png) | [Capture](apres/W14.png) | [Capture](apres/W14-mobile-390.png) |
| W15 | ENS | [Capture](avant/W15.png) | [Capture](apres/W15.png) | [Capture](apres/W15-mobile-390.png) |
| W16 | ENS | [Capture](avant/W16.png) | [Capture](apres/W16.png) | [Capture](apres/W16-mobile-390.png) |
| W17 | ENS | [Capture](avant/W17.png) | [Capture](apres/W17.png) | [Capture](apres/W17-mobile-390.png) |
| W18 | ENS | [Capture](avant/W18.png) | [Capture](apres/W18.png) | [Capture](apres/W18-mobile-390.png) |
| W19 | DIR | [Capture](avant/W19.png) | [Capture](apres/W19.png) | [Capture](apres/W19-mobile-390.png) |
| W20 | DIR | [Capture](avant/W20.png) | [Capture](apres/W20.png) | [Capture](apres/W20-mobile-390.png) |
| W21 | DIR | [Capture](avant/W21.png) | [Capture](apres/W21.png) | [Capture](apres/W21-mobile-390.png) |
| W22 | DIR | [Capture](avant/W22.png) | [Capture](apres/W22.png) | [Capture](apres/W22-mobile-390.png) |
| W23 | DIR | [Capture](avant/W23.png) | [Capture](apres/W23.png) | [Capture](apres/W23-mobile-390.png) |
| W24 | DIR | [Capture](avant/W24.png) | [Capture](apres/W24.png) | [Capture](apres/W24-mobile-390.png) |
| W25 | SEC | [Capture](avant/W25.png) | [Capture](apres/W25.png) | [Capture](apres/W25-mobile-390.png) |
| W26 | ADM | [Capture](avant/W26.png) | [Capture](apres/W26.png) | [Capture](apres/W26-mobile-390.png) |
| W27 | SEC | [Capture](avant/W27.png) | [Capture](apres/W27.png) | [Capture](apres/W27-mobile-390.png) |

Les états métier détaillés complètent les vues de lecture : [homonymes](apres/W10-homonymes.png), [note zéro](apres/W16-zero-et-homonymes.png), [confirmation](apres/W17-confirmation-reelle.png), [correction](apres/W18-correction-reelle.png), [détail](apres/W20-detail-reel.png), [rejet](apres/W21-rejet-reel.png), [prévisualisation](apres/W22-avant-cloture.png), [clôture](apres/W23-confirmation-reelle.png), [publication](apres/W24-publication-reelle.png), [PDF du parcours](apres/W25-parcours-reel.png).

Les nouveaux boutons de navigation/dossier et le parcours critique sont joués. Les actions de création scolaire, de comptes et d’audit sont couvertes par les tests API/DB et une lecture navigateur ; elles ne sont pas toutes rejouées par clic dans cette tranche. Aucun contrôle exhaustif de lecteur d’écran ni validation réglementaire des formulaires n’est revendiqué.
