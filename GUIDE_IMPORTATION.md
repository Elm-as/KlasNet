# Guide d'Importation Complète - Élèves et Paiements

## Vue d'ensemble

Cette fonctionnalité permet d'importer en une seule opération:
- ✅ Les élèves avec leurs informations
- ✅ Les classes (création automatique si nécessaire)
- ✅ Les paiements mensuels avec allocation intelligente
- ✅ Les contacts parents (numéro de téléphone)
- ✅ La détection automatique des élèves protégés

## Format du fichier Excel requis

### Colonnes obligatoires

1. **Nom & Prénoms** (ou variations: "Nom et Prénoms", "Nom Prénoms")
   - Format: `NOM Prénoms`
   - Exemple: `KOUASSI Jean-Marc`

2. **Classe** (insensible à la casse)
   - Format: `Niveau Section`
   - Exemples: `CP1 A`, `CE2 B`, `CM1 A`

### Colonnes optionnelles

3. **Contact** (ou "Téléphone", "Tel")
   - Numéro de téléphone du parent (père par défaut)
   - Exemple: `0701234567`, `+225 07 01 23 45 67`

4. **Statut**
   - Utilisé pour détecter les élèves protégés
   - Valeurs: `Soldé`, `En cours`, etc.

5. **Montant Scolarité**
   - Montant total dû par l'élève
   - Utilisé pour la détection des élèves protégés

6. **Total Payé**
   - Montant total déjà payé
   - Utilisé pour la détection des élèves protégés

### Colonnes de paiements mensuels

Les colonnes suivantes sont détectées automatiquement:
- **Inscription** (modalité 1)
- **Octobre** (modalité 2)
- **Novembre** (modalité 3)
- **Décembre** (modalité 4)
- **Janvier** (modalité 5)
- **Février** (modalité 6)
- **Mars** (modalité 7)
- **Avril**, **Mai**, **Juin**, **Juillet**, **Août**, **Septembre**

## Fonctionnalités intelligentes

### 1. Création automatique des classes

Le système analyse la colonne "Classe" et:
- Parse le niveau et la section (ex: "CP1 A" → niveau="CP1", section="A")
- Vérifie si la classe existe déjà
- Crée automatiquement la classe si elle n'existe pas
- Associe l'élève à la classe

### 2. Détection des élèves protégés

Un élève est considéré comme "protégé" si:
- Le statut contient "Soldé" ou "Solde"
- ET le montant payé est inférieur à 50% du montant total dû

Les élèves protégés:
- Ne paient que l'inscription (modalité 1)
- Les autres paiements sont ignorés automatiquement

### 3. Allocation intelligente des paiements

Pour chaque paiement:
- Le système utilise la fonction `processPayment` qui alloue automatiquement aux échéances
- Les paiements sont traités dans l'ordre des modalités (1, 2, 3, etc.)
- Si un paiement dépasse le montant d'une échéance, l'excédent est automatiquement reporté sur la suivante
- Les avances sont enregistrées comme crédits

**Exemple:**
```
Élève: KOUASSI Jean
Inscription: 35 000 FCFA
Octobre: 20 000 FCFA (au lieu de 15 000)

Résultat:
- Modalité 1 (Inscription): 35 000 FCFA ✓
- Modalité 2 (V1): 15 000 FCFA ✓
- Modalité 3 (V2): 5 000 FCFA (excédent d'octobre)
- Crédit restant: 0 FCFA
```

### 4. Importation des contacts

- Le numéro de téléphone est nettoyé (suppression des espaces, caractères spéciaux)
- Assigné au champ `telephone` de l'élève (père par défaut)
- Peut être modifié manuellement après l'importation

## Utilisation

### Étape 1: Préparer le fichier Excel

1. Assurez-vous que votre fichier contient au minimum les colonnes "Nom & Prénoms" et "Classe"
2. Vérifiez que les noms de classes sont cohérents (ex: CP1 A, CP2 A, etc.)
3. Les montants doivent être en chiffres (les espaces et symboles sont automatiquement supprimés)

### Étape 2: Accéder à l'importation

1. Allez dans **Configuration** → **Importation Complète**
2. Cliquez sur "Sélectionner le fichier Excel"
3. Choisissez votre fichier (.xlsx ou .xls)

### Étape 3: Lancer l'importation

1. Cliquez sur "Lancer l'importation"
2. Attendez la fin du traitement (peut prendre quelques secondes selon le nombre d'élèves)
3. Consultez les résultats

### Étape 4: Vérifier les résultats

Le système affiche:
- ✅ **Nombre d'élèves importés** avec leurs détails
- ✅ **Classes créées automatiquement**
- ✅ **Paiements traités** avec le détail par élève
- ⚠️ **Erreurs éventuelles** avec le numéro de ligne et la description

## Gestion des erreurs

### Erreurs courantes

1. **"Colonne 'Nom & Prénoms' non trouvée"**
   - Vérifiez que votre fichier contient bien une colonne avec "Nom" et "Prénoms"
   - La détection est insensible à la casse

2. **"Colonne 'Classe' non trouvée"**
   - Assurez-vous d'avoir une colonne "Classe" dans votre fichier

3. **"Nom invalide" (ligne X)**
   - La ligne ne contient pas de nom valide
   - Vérifiez que la cellule n'est pas vide

4. **"Classe invalide" (ligne X)**
   - Le format de la classe n'est pas reconnu
   - Utilisez le format: `Niveau Section` (ex: CP1 A)

### Lignes ignorées

Les lignes suivantes sont automatiquement ignorées:
- Lignes vides (sans nom ou classe)
- Lignes avec des erreurs (enregistrées dans la section "Erreurs")

## Après l'importation

### Vérifications recommandées

1. **Vérifier les élèves**
   - Allez dans **Élèves** → **Liste des élèves**
   - Vérifiez que tous les élèves sont présents
   - Vérifiez les classes assignées

2. **Vérifier les classes**
   - Allez dans **Classes** → **Liste des classes**
   - Vérifiez que toutes les classes ont été créées

3. **Vérifier les paiements**
   - Allez dans **Finances** → **Liste des paiements**
   - Vérifiez les montants et allocations

4. **Vérifier les élèves protégés**
   - Dans la liste des élèves, filtrez par statut "Protégé"
   - Vérifiez que seuls les bons élèves sont marqués comme protégés

### Modifications manuelles

Après l'importation, vous pouvez:
- Modifier les informations des élèves (sexe, date de naissance, etc.)
- Ajouter des photos
- Corriger les contacts parents
- Modifier le statut "protégé" si nécessaire
- Ajouter des paiements supplémentaires

## Exemple de fichier Excel

```
| Nom & Prénoms        | Classe | Contact      | Inscription | Octobre | Novembre | Statut |
|---------------------|--------|--------------|-------------|---------|----------|--------|
| KOUASSI Jean-Marc   | CP1 A  | 0701234567   | 35000       | 15000   | 15000    | En cours |
| DIABATE Marie       | CP1 A  | 0707654321   | 35000       | 15000   | 10000    | En cours |
| YAO Kouadio         | CE2 B  | 0709876543   | 35000       | 0       | 0        | Soldé  |
| KONE Aya            | CM1 A  | 0701112233   | 35000       | 20000   | 15000    | En cours |
```

## Support

Pour toute question ou problème:
1. Consultez la section "Erreurs" après l'importation
2. Vérifiez le format de votre fichier Excel
3. Contactez l'administrateur système si le problème persiste

## Notes importantes

⚠️ **Attention:**
- L'importation crée de nouveaux élèves, elle ne met pas à jour les élèves existants
- Les matricules sont générés automatiquement
- Les paiements sont enregistrés avec la date du mois correspondant
- Les élèves protégés ne paient que l'inscription

✅ **Bonnes pratiques:**
- Faites une sauvegarde avant l'importation (Configuration → Sauvegarde & Restauration)
- Vérifiez votre fichier Excel avant l'importation
- Importez par petits lots si vous avez beaucoup d'élèves
- Vérifiez les résultats après chaque importation
