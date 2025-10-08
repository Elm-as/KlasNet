// Types de base
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// École et configuration
export interface Ecole extends BaseEntity {
  nom: string;
  adresse: string;
  codeEtablissement: string;
  telephone: string;
  email: string;
  logo: string;
  devise: string;
  anneeScolaireActive: string;
  compositions: CompositionConfig[];
}

// Utilisateur avec nom d'utilisateur au lieu d'email
export interface Utilisateur extends BaseEntity {
  nom: string;
  prenoms: string;
  nomUtilisateur: string; // au lieu d'email
  motDePasse?: string; // stocké de manière sécurisée
  role: 'Admin' | 'Secrétaire' | 'Enseignant' | 'Directeur';
  actif: boolean;
}

// Élève
export interface Eleve extends BaseEntity {
  matricule: string;
  nom: string;
  prenoms: string;
  sexe: 'M' | 'F';
  dateNaissance: string;
  lieuNaissance: string;
  classeId: string;
  anneeEntree: string;
  statut: 'Actif' | 'Inactif' | 'Transféré';
  pereTuteur: string;
  mereTutrice: string;
  telephone: string;
  adresse: string;
  photo: string;
  protege?: boolean; // élève protégé: ne paie que l'inscription
  garantId?: string; // référence vers un enseignant garant (facultatif)
}

// Enseignant
export interface Enseignant extends BaseEntity {
  nom: string;
  prenoms: string;
  sexe: 'M' | 'F';
  telephone: string;
  adresse: string;
  specialite: string;
  diplome: string;
  dateEmbauche: string;
  statut: 'Actif' | 'Inactif' | 'Congé';
  salaire: number;
  photo: string;
  classesPrincipales: string[];
  matieresEnseignees: string[];
}

// Matière
export interface Matiere extends BaseEntity {
  nom: string;
  abreviation: string;
  coefficient: number;
  type: 'Fondamentale' | 'Éveil' | 'Expression';
  obligatoire: boolean;
  classeIds: string[];
  baremeParNiveau: Record<string, { min: number; max: number }>;
}

// Classe
export interface Classe extends BaseEntity {
  niveau: string;
  section: string;
  anneeScolaire: string;
  enseignantPrincipal: string;
  effectifMax: number;
  salle: string;
  matieres: Matiere[];
}

// Configuration des compositions par niveau
export interface CompositionConfig extends BaseEntity {
  nom: string;
  coefficient: number;
  niveau?: string; // optionnel pour spécifier par niveau
  ordre: number; // ordre d'affichage
}

// Note avec référence à la composition
export interface Note extends BaseEntity {
  eleveId: string;
  matiereId: string;
  compositionId: string;
  classeId: string; // ajout pour faciliter les requêtes
  valeur: number;
  date: string;
  bareme: number; // /20, /50, etc.
}

// Moyenne calculée automatiquement
export interface MoyenneEleve extends BaseEntity {
  eleveId: string;
  classeId: string;
  compositionId: string;
  moyenne: number;
  rang?: number;
  dateCalcul: string;
}

// Frais scolaires
export interface FraisScolaire extends BaseEntity {
  niveau: string;
  anneeScolaire: string;
  fraisInscription: number;
  fraisScolarite: number;
  fraisCantine: number;
  fraisTransport: number;
  fraisFournitures: number;
  montant?: number; // total calculé
  echeances?: EcheancePaiement[];
}

export interface EcheancePaiement {
  id: string;
  date: string;
  montant: number;
  modalite: number;
  label: string;
}

export interface Allocation {
  echeanceId: string;
  montant: number;
}

// Paiement
export interface Paiement extends BaseEntity {
  eleveId: string;
  montant: number;
  datePaiement: string;
  typeFrais: string;
  versementIndex?: number;
  modePaiement: 'Espèces' | 'Mobile Money' | 'Chèque' | 'Virement';
  numeroRecu: string;
  operateur: string;
  notes: string;
  allocations?: Allocation[];
  avance?: number;
  canceled?: boolean;
}

// Situation financière
export interface SituationFinanciere {
  eleveId: string;
  totalDu: number;
  totalPaye: number;
  solde: number;
  statut: 'Payé' | 'Partiellement Payé' | 'Non Payé';
  dernierPaiement?: string;
}

// Historique des actions
export interface HistoriqueAction extends BaseEntity {
  type: 'creation' | 'modification' | 'suppression' | 'paiement' | 'autre';
  cible: string;
  cibleId?: string;
  description: string;
  utilisateur: string;
  date: string;
}