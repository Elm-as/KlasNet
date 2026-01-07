# Logiciel de Gestion Scolaire - École Primaire Côte d'Ivoire

## 🎯 Description

Application web complète de gestion scolaire spécialement conçue pour les écoles primaires ivoiriennes. Le système gère tous les aspects administratifs : élèves, enseignants, classes, matières, finances, notes et bulletins.

## ✨ Fonctionnalités Principales

### 📚 Gestion des Élèves
- Inscription complète avec matricule automatique
- Upload de photos d'élèves
- Recherche et filtrage avancés avec debounce
- Import/Export Excel optimisé
- Suivi du statut (Actif, Inactif, Transféré)
- **📖 Parcours académique détaillé** : Historique année par année avec moyennes, rang, et statut (admis/redoublant)

### 👨‍🏫 Gestion des Enseignants
- Profils complets des enseignants
- Assignation aux classes
- Suivi des spécialités et diplômes
- Gestion des salaires

### 🏫 Gestion des Classes
- Configuration par niveau (CP1, CP2, CE1, CE2, CM1, CM2)
- Assignation des enseignants principaux
- Gestion de l'effectif maximum
- Attribution des salles
- Vérification automatique de l'intégrité des données

### 📖 Gestion des Matières
- Création de matières personnalisées
- Configuration des coefficients
- Types : Fondamentale, Éveil, Expression
- Matières obligatoires/optionnelles
- Détection des matières non utilisées

### 💰 Système Financier (OPTIMISÉ)
- Configuration des frais par niveau
- Suivi des paiements en temps réel avec memoization
- Génération de reçus automatiques
- Statuts : Soldé ✅, Partiel ⚠️, Impayé ❌
- Dashboard financier avec graphiques
- Recherche optimisée avec debounce (300ms)
- Traçabilité complète des opérations

### 📊 Système de Notes
- Saisie par compositions (système ivoirien)
- 4 compositions avec la dernière coefficient 50%
- Calcul automatique des moyennes
- Génération de bulletins PDF
- Classements et mentions
- Auto-sauvegarde et protection des modifications

### 🔍 Intégrité des Données (NOUVEAU)
- Détection automatique des problèmes
- Classes sans niveau
- Élèves sans classe valide
- Matières non utilisées
- Montants manquants
- Corrections automatiques ou guidées

### 📋 Journal d'Audit (NOUVEAU)
- Traçabilité de toutes les opérations
- Historique des imports/exports
- Suivi des paiements
- Modifications de notes
- Export en JSON
- Filtres et recherche avancés

### 🎓 Suivi du Parcours Académique (NOUVEAU)
- **Historique complet** : Enregistrement automatique de chaque année scolaire
- **Visualisation chronologique** : Timeline détaillée du parcours de l'élève
- **Statistiques** : Années au total, promotions, redoublements, moyenne globale
- **Détails par année** : Classe, niveau, moyenne annuelle, rang, statut (Admis/Redoublant)
- **Enregistrement automatique** : Lors du passage d'année scolaire avec DFA
- **Observations personnalisées** : Notes et remarques sur chaque année

Le système crée automatiquement une entrée dans le parcours académique de chaque élève lors du passage d'année, permettant un suivi complet de l'évolution scolaire sur plusieurs années.

### 🔐 Système de Licence Avancé
- **Fonctionnement hors ligne** avec vérification locale
- **Protection anti-triche** (détection manipulation date)
- **Mise à jour automatique** quand internet disponible
- **Activation manuelle** par clé de licence
- **Types de licences** : Essai (7j), Mensuelle, Annuelle

## 🛡️ Système de Licence - Guide Complet

### Comment ça fonctionne

1. **Vérification locale** : Le logiciel vérifie la licence stockée localement
2. **Détection anti-triche** : Détecte si la date système a été modifiée
3. **Mise à jour auto** : Télécharge automatiquement les nouvelles licences si internet disponible
4. **Activation manuelle** : Permet d'entrer une clé fournie manuellement
5. **Blocage automatique** : Bloque l'accès si la licence est expirée

### Générer des Licences (Côté Admin)

```javascript
// Dans la console du navigateur (pour tests)
generateLicences()

// Cela génère :
// - Une licence d'essai de 7 jours
// - Une clé d'activation mensuelle
// - Une clé d'activation annuelle
```

### Activer une Licence

1. **Automatique** : Si internet disponible, les licences se mettent à jour automatiquement
2. **Manuelle** : Entrer la clé de licence dans l'interface de blocage

### Structure d'une Clé de Licence

```
Format : Base64 encodé contenant :
{
  "key": "SCHOOL_ECOLE001_1234567890",
  "ecoleId": "ECOLE001", 
  "dateExpiration": "2024-12-31T23:59:59.999Z",
  "signature": "hash_de_sécurité"
}
```

### API Serveur de Licences

Le système peut se connecter à une API pour :
- Vérifier les licences
- Télécharger les mises à jour
- Renouveler automatiquement

## 🚀 Installation et Démarrage

```bash
# Installer les dépendances
npm install

# Démarrer en mode développement
npm run dev

# Construire pour la production
npm run build
```

## 📱 Interface Utilisateur

- **Design moderne** inspiré d'Excel avec grilles interactives
- **Responsive** : fonctionne sur mobile, tablette et desktop
- **Interface en français** adaptée au contexte ivoirien
- **Couleurs** : Vert éducation (#16A085), Bleu académique (#2980B9)
- **Animations fluides** pour une expérience utilisateur optimale

## 🎨 Fonctionnalités Interface

### Grilles Excel-like
- Tri par colonnes
- Filtrage en temps réel
- Recherche instantanée
- Édition en ligne (double-clic)
- Actions contextuelles

### Dashboard Interactif
- Métriques en temps réel
- Graphiques des recettes
- Situation des paiements
- Alertes pour impayés
- Actions rapides

### Formulaires Modernes
- Validation en temps réel
- Auto-complétion
- Upload de photos avec prévisualisation
- Messages d'erreur contextuels

## 💾 Stockage des Données

- **Local Storage** : Stockage local pour fonctionnement hors ligne
- **Structure JSON** : Données organisées en collections
- **Sauvegarde automatique** : Toutes les modifications sont sauvegardées
- **Import/Export** : Possibilité d'importer/exporter les données

## 🔧 Technologies Utilisées

- **Frontend** : React 18 + TypeScript
- **Styling** : Tailwind CSS
- **Icons** : Lucide React
- **Charts** : Recharts
- **Forms** : React Hook Form
- **Build** : Vite
- **Dates** : date-fns
- **Virtualisation** : react-window (pour grandes listes)
- **Performance** : Debounce, Memoization, Lazy Loading

## 🚀 Optimisations de Performance

### Recherche et Filtres
- Debounce de 300ms sur les champs de recherche
- Réduction des re-rendus pendant la saisie

### Calculs Financiers
- Memoization avec Map pour lookup O(1)
- Cache des données stables (TTL configurable)
- Amélioration significative avec 100+ élèves

### Interface Utilisateur
- Skeleton loading pour meilleure UX
- Virtualisation des longues listes
- Composants réutilisables optimisés

### Traçabilité
- Journal d'audit complet
- Export des logs
- Filtres et recherche avancés

Pour plus de détails, consultez [OPTIMISATION_FRONTEND.md](OPTIMISATION_FRONTEND.md)

## 📋 Modules Disponibles

### ✅ Modules Implémentés
- [x] Dashboard avec métriques
- [x] Gestion complète des élèves
- [x] Gestion des enseignants
- [x] Gestion des classes
- [x] Gestion des matières
- [x] Système de licence complet
- [x] Interface responsive
- [x] Module Finances (paiements, reçus)
- [x] Module Notes (saisie, bulletins)
- [x] Configuration de l'école
- [x] Rapports et statistiques
- [x] Sauvegarde cloud
- [x] Comptabilité
- [x] Gestion du personnel administratif
- [x] Gestion des Licences
- [x] Formulaire de connexion
- [x] Impression des reçus de paiement
- [x] Impression des convocations
- [x] Impression du journal de comptabilité
- [x] **Optimisations de performance (debounce, memoization, virtualisation)**
- [x] **Intégrité des données avec détection et correction automatique**
- [x] **Journal d'audit pour traçabilité complète**
- [x] **Composants UI réutilisables (skeleton, progress, etc.)**
- [x] **Suivi du parcours académique avec historique détaillé année par année**

### 🚧 Modules en Développement
- [ ] Impression de la liste des notes et moyennes
- [ ] Impression des bulletins
- [ ] Mode tableur avancé pour saisie de notes (navigation clavier, copier-coller)
- [ ] Génération PDF asynchrone pour impressions volumineuses
- [ ] Feature flags pour activation progressive des fonctionnalités

## 🎓 Adaptation au Système Ivoirien

- **Niveaux** : PS, MS, GS, CP1, CP2, CE1, CE2, CM1, CM2
- **Compositions** : Modifiable selon les écoles
- **Devise** : FCFA
- **Format dates** : Français (dd/mm/yyyy)
- **Matières** : Adaptées aux écoles
- **Bulletins** : Format officiel ivoirien

## 📞 Support et Contact

Pour toute question ou support technique :
- **Email** : xxxxxxxxxxxxx@gmail.com
- **Téléphone** : +225 XX XX XX XX XX
- **Documentation** : Consultez ce README

## 🔄 Mises à Jour

Le système vérifie automatiquement les mises à jour de licence et peut être étendu pour vérifier les mises à jour logicielles.

## 📄 Licence Logicielle

Ce logiciel est protégé par un système de licence. Chaque école doit disposer d'une licence valide pour utiliser le système.

---

**Développé spécialement pour les écoles primaires de Côte d'Ivoire** 🇨🇮