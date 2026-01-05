# Guide de Navigation - KlasNet

## Vue d'ensemble

Ce document décrit la navigation améliorée et les fonctionnalités impeccables de KlasNet, de la gestion des utilisateurs à la gestion scolaire complète.

## Flux de Navigation

### 1. Première utilisation (Licence Expirée)

#### Écran de Licence Expirée
```
┌─────────────────────────────────────┐
│  🛡️  Licence Expirée                │
│                                     │
│  Statut: Essai expiré              │
│  Expiration: 13/12/2025            │
│  Jours restants: 0                 │
│                                     │
│  [⚙️ Configurer l'application]     │
│  [🔑 Activer une nouvelle licence] │
│                                     │
│  📞 +2250555863953                 │
└─────────────────────────────────────┘
```

**Actions possibles**:
1. **Configurer l'application** → ConfigEcole avec bouton retour
2. **Activer une nouvelle licence** → Formulaire d'activation

#### ConfigEcole (depuis Licence Expirée)
```
┌─────────────────────────────────────┐
│  ← Retour                           │  ← NOUVEAU !
│                                     │
│  🏫 Configuration de l'École        │
│                                     │
│  Logo: [Upload]                    │
│  Nom: École Primaire Excellence    │
│  Code: EPE2025                     │
│  ...                               │
│                                     │
│  [💾 Enregistrer la configuration] │
└─────────────────────────────────────┘
```

**Après enregistrement**:
- Event `ecole:created` déclenché
- Licence d'essai automatiquement créée (7 jours)
- Retour automatique à l'écran licence
- Accès à l'application si licence valide

### 2. Navigation dans l'application (Licence Active)

#### Menu Principal de Configuration
```
┌─────────────────────────────────────────────────────────┐
│  Configuration Système                                  │
│  Paramètres généraux de votre école                    │
│                                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│  │ 🏫      │  │ 💰      │  │ 📚      │               │
│  │ École   │  │ Frais   │  │ Compos. │               │
│  │         │  │         │  │         │               │
│  │ Config  │  │ Config  │  │ Config  │               │
│  └─────────┘  └─────────┘  └─────────┘               │
│                                                         │
│  [+ 8 autres sections...]                              │
│                                                         │
│  Système: 150 élèves | 12 classes | 15 matières       │
└─────────────────────────────────────────────────────────┘
```

#### Navigation vers sous-sections
```
Menu → Clic sur section → Page section
                           │
                           ├─ ← Retour (animé)
                           │
                           └─ Contenu de la section
```

## Responsive Design

### Mobile (< 640px)
```
┌──────────────┐
│ ← Retour     │  ← Toujours visible
│              │
│ [Section 1]  │
│              │
│ [Section 2]  │
│              │
│ [Section 3]  │
│              │
│ (1 colonne)  │
└──────────────┘
```

### Tablette (640px - 1023px)
```
┌─────────────────────────┐
│ ← Retour                │
│                         │
│ [Section 1] [Section 2] │
│                         │
│ [Section 3] [Section 4] │
│                         │
│ (2 colonnes)            │
└─────────────────────────┘
```

### Desktop (1024px+)
```
┌──────────────────────────────────────┐
│ ← Retour                             │
│                                      │
│ [Section 1] [Section 2] [Section 3] │
│                                      │
│ [Section 4] [Section 5] [Section 6] │
│                                      │
│ (3 colonnes)                         │
└──────────────────────────────────────┘
```

## Gestion Impeccable

### 1. Gestion des Utilisateurs

#### Authentification
- **LoginForm** : Authentification sécurisée
- Gestion des rôles (Admin, Enseignant, etc.)
- Session persistante

#### Profils Utilisateurs
- UserSettings : Paramètres personnels
- UserProfile : Informations complètes
- Changement de mot de passe

### 2. Gestion Scolaire

#### Élèves
- **ElevesList** : Liste complète avec recherche
- Import/Export Excel
- Fiches complètes avec photos
- Historique des paiements
- Bulletins de notes

#### Classes
- **ClassesList** : Gestion par niveau
- Affectation des enseignants
- Configuration des effectifs
- Attribution des matières

#### Matières
- **MatiereForm** : Création/édition
- **Génération automatique d'abréviations** (60+ cas)
- Configuration coefficients
- Barèmes par niveau

#### Finances
- **FinancesList** : Vue d'ensemble des paiements
- **FinancesListEnhanced** : Version moderne avec statistiques
- Suivi en temps réel
- Génération de reçus
- Convocations automatiques

#### Notes
- **NotesParClasse** : Saisie par composition
- Calcul automatique des moyennes
- Classements et rangs
- Auto-sauvegarde
- Bulletins PDF

### 3. Configuration Système

#### ConfigEcole
- Logo, nom, coordonnées
- **Bouton retour** ✓
- Aperçu temps réel
- Validation stricte

#### ConfigFrais
- Configuration par niveau
- Échéances de paiement
- Montants personnalisables

#### ConfigCompositions
- 4 compositions
- Coefficients
- Périodes d'évaluation

#### ConfigImpression
- En-têtes personnalisés
- Logos
- Mise en page documents

#### DataIntegrityView (NOUVEAU)
- Détection automatique problèmes
- Corrections guidées
- Classes sans niveau
- Élèves orphelins
- Montants manquants

#### AuditLogView (NOUVEAU)
- Historique complet
- 1000 dernières entrées
- Filtres avancés
- Export JSON

## Animations et Transitions

### Boutons Retour
```tsx
// Animation au survol
<ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
```

### Cartes Interactives
```tsx
// Hover effects
hover:border-gray-300 
hover:shadow-sm 
transition-all
```

### Icônes
```tsx
// Changement de couleur
group-hover:bg-gray-200 
transition-colors
```

## Accessibilité

### Keyboard Navigation
- Tab : Navigation entre éléments
- Enter : Activation
- Esc : Fermeture modales

### Touch Targets
- Minimum 44x44px
- Espacement généreux
- Feedback visuel

### Couleurs
- Contraste WCAG AA
- États visuels clairs
- Icônes + texte

## Checklist Qualité ✓

### Navigation
- [x] Boutons retour partout
- [x] Breadcrumbs visuels
- [x] Transitions fluides
- [x] États actifs visibles

### Responsive
- [x] Mobile (320px+)
- [x] Tablette (768px+)
- [x] Desktop (1024px+)
- [x] 4K/Ultra-wide

### Performance
- [x] Debounce recherche (300ms)
- [x] Memoization calculs
- [x] Lazy loading modules
- [x] Virtual scrolling

### UX
- [x] Loading states (skeleton)
- [x] Progress indicators
- [x] Toast notifications
- [x] Validation en temps réel

### Sécurité
- [x] Validation formulaires
- [x] Protection XSS
- [x] Gestion sessions
- [x] Audit trail

## Support Multi-Écrans

### Breakpoints Tailwind
```css
sm:  640px   /* Tablette portrait */
md:  768px   /* Tablette paysage */
lg:  1024px  /* Desktop */
xl:  1280px  /* Large desktop */
2xl: 1536px  /* Ultra-wide */
```

### Stratégie Mobile-First
```tsx
// Base (mobile)
className="p-4 text-sm"

// Tablette et plus
className="p-4 sm:p-6 text-sm sm:text-base"

// Desktop et plus
className="p-4 sm:p-6 lg:p-8 text-sm sm:text-base lg:text-lg"
```

## Patterns de Design

### ModuleContainer
```tsx
<ModuleContainer
  title="Titre"
  subtitle="Sous-titre"
  actions={<Button />}
>
  {content}
</ModuleContainer>
```

### Cartes de Statistiques
```tsx
<div className="bg-gradient-to-br from-green-50 to-green-100">
  <Icon />
  <Stat />
  <ProgressIndicator />
</div>
```

### Tables Adaptatives
```tsx
<table>
  <td className="hidden sm:table-cell">Tablette+</td>
  <td className="hidden lg:table-cell">Desktop+</td>
</table>
```

## Troubleshooting

### Navigation ne fonctionne pas
1. Vérifier `currentSection` state
2. Vérifier event listeners
3. Console logs pour debug

### Bouton retour invisible
1. Vérifier `onBack` prop
2. Vérifier breakpoints responsive
3. Inspecter z-index

### Layout cassé sur mobile
1. Vérifier `min-w-0` sur flex items
2. Vérifier `overflow-hidden`
3. Tester avec DevTools mobile

## Maintenance

### Ajouter nouvelle section Config
```tsx
// 1. Ajouter dans ConfigSection type
type ConfigSection = '...' | 'nouvelle';

// 2. Ajouter dans configSections array
{
  id: 'nouvelle' as ConfigSection,
  title: 'Nouvelle Section',
  description: 'Description...',
  icon: IconComponent
}

// 3. Ajouter case dans renderContent()
case 'nouvelle':
  return <NouvelleSection />;
```

### Modifier animations
```tsx
// Durée
transition-all duration-200

// Ease
transition-all ease-in-out

// Transform
hover:scale-105
```

## Best Practices

1. **Toujours** ajouter bouton retour aux nouvelles pages
2. **Tester** sur 3 tailles d'écran minimum
3. **Utiliser** les composants UI réutilisables
4. **Valider** accessibilité keyboard
5. **Documenter** nouveaux flux navigation

---

**Dernière mise à jour**: 2026-01-05
**Version**: 1.0.3
**Auteur**: GitHub Copilot Agent
