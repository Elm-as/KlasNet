# Guide du Parcours Académique

## 📖 Vue d'ensemble

Le système de parcours académique permet de suivre l'évolution scolaire de chaque élève année après année. Cette fonctionnalité enregistre automatiquement l'historique de chaque élève lors du passage d'année scolaire.

## ✨ Fonctionnalités

### 📊 Suivi Automatique
- **Enregistrement automatique** lors du passage d'année avec DFA
- **Historique complet** de toutes les années passées dans l'école
- **Statuts trackés** : Admis, Redoublant, Transféré, Abandonné, En cours

### 📈 Statistiques Globales
Pour chaque élève, le système affiche :
- **Nombre total d'années** à l'école
- **Nombre d'admissions** (promotions)
- **Nombre de redoublements**
- **Moyenne globale** sur toutes les années

### 📋 Détails par Année
Pour chaque année scolaire, le système enregistre :
- **Classe et niveau** (CP1, CE1, CM1, etc.)
- **Section** de la classe
- **Moyenne annuelle** sur 20
- **Rang** dans la classe
- **Statut** de fin d'année (Admis ou Redoublant)
- **Observations** personnalisées

## 🚀 Utilisation

### Visualiser le Parcours d'un Élève

1. **Accéder à la liste des élèves**
   - Cliquez sur "Élèves" dans le menu principal

2. **Sélectionner un élève**
   - Cliquez sur la ligne d'un élève ou sur le bouton "Modifier"

3. **Consulter le parcours**
   - Descendez jusqu'à la section "Parcours Académique"
   - Le système affiche une timeline chronologique
   - Les statistiques globales sont visibles en haut

### Timeline Visuelle

La timeline affiche :
- **Icône verte** (↗️) : Année avec promotion (Admis)
- **Icône orange** (↘️) : Année avec redoublement
- **Icône bleue** (🎓) : Année en cours

### Cartes Statistiques

Quatre cartes en haut du parcours affichent :
1. **Années au total** : Nombre d'années dans l'école
2. **Admissions** : Nombre de promotions
3. **Redoublements** : Nombre d'années redoublées
4. **Moyenne globale** : Moyenne calculée sur toutes les années

## ⚙️ Configuration

### Initialisation pour École Existante

Si vous installez cette fonctionnalité dans une école avec des données existantes :

1. **Accéder à la configuration**
   - Menu "Configuration" → "Passage d'année"

2. **Initialiser les parcours**
   - En haut de la page, section bleue "Initialiser le parcours académique"
   - Cliquer sur "Initialiser les parcours académiques"
   - Le système crée automatiquement des entrées "En cours" pour tous les élèves actifs

3. **Vérification**
   - Un message confirme : "X parcours académiques créés, Y élèves ignorés"
   - Les élèves inactifs ou sans classe sont ignorés

### Passage d'Année Automatique

Lors du passage d'année scolaire avec DFA :

1. **Le système enregistre automatiquement** :
   - Clôture l'année en cours pour chaque élève
   - Enregistre la moyenne annuelle
   - Définit le statut (Admis ou Redoublant)
   - Crée une nouvelle entrée "En cours" pour l'année suivante

2. **Promotion** :
   - Statut : **Admis**
   - L'élève est assigné à la classe suivante
   - Une nouvelle entrée "En cours" est créée pour le nouveau niveau

3. **Redoublement** :
   - Statut : **Redoublant**
   - L'élève reste dans la même classe
   - Une nouvelle entrée "En cours" est créée pour la même année

## 📝 Cas d'Usage

### Suivre la Progression d'un Élève

**Exemple** : Élève A, inscrit en CP1 en 2020-2021

| Année | Niveau | Moyenne | Statut |
|-------|--------|---------|--------|
| 2020-2021 | CP1 | 12.5/20 | Admis |
| 2021-2022 | CP2 | 11.8/20 | Admis |
| 2022-2023 | CE1 | 9.2/20 | Redoublant |
| 2023-2024 | CE1 | 13.1/20 | Admis |
| 2024-2025 | CE2 | - | En cours |

**Statistiques** :
- 5 années au total
- 3 admissions
- 1 redoublement
- Moyenne globale : 11.65/20

### Identifier les Élèves en Difficulté

Le parcours permet de :
- **Voir rapidement** combien de fois un élève a redoublé
- **Analyser l'évolution** : moyennes en progression ou en baisse
- **Prendre des décisions** : accompagnement personnalisé, tutorat

### Justifier les Décisions

Le parcours académique sert de :
- **Preuve documentée** des résultats de l'élève
- **Historique complet** pour les discussions avec les parents
- **Base de décision** pour les orientations futures

## 🔧 Maintenance

### Données Archivées

- Les parcours académiques sont **conservés indéfiniment**
- Lors du passage d'année, une **archive JSON** est créée
- L'archive contient toutes les données avant le passage

### Sauvegarde et Restauration

- Les parcours font partie de la **sauvegarde globale** du système
- Lors d'un export, la collection `parcoursAcademiques` est incluse
- Lors d'un import, les parcours sont restaurés automatiquement

## ❓ Questions Fréquentes

### Que se passe-t-il si j'installe la fonctionnalité en milieu d'année ?

- Utilisez le bouton "Initialiser les parcours académiques"
- Le système crée des entrées "En cours" pour tous les élèves actifs
- Au prochain passage d'année, ces entrées seront complétées

### Puis-je modifier manuellement un parcours ?

- Non, le système ne permet pas de modification manuelle
- Les parcours sont créés automatiquement lors du passage d'année
- Cela garantit l'intégrité et la fiabilité des données

### Les parcours incluent-ils les élèves transférés ?

- Oui, le système peut enregistrer le statut "Transféré"
- Actuellement, ce statut doit être défini manuellement
- Les élèves marqués "Inactif" ne sont pas inclus dans les nouveaux parcours

### Peut-on exporter les parcours académiques ?

- Oui, via la fonction de sauvegarde complète
- Format JSON incluant tous les parcours
- Peut être importé dans un autre système KlasNet

## 📞 Support

Pour toute question sur le parcours académique :
- Consultez ce guide
- Contactez le support technique
- Email : xxxxxxxxxxxxx@gmail.com

---

**Développé pour les écoles primaires de Côte d'Ivoire** 🇨🇮
