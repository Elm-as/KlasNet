import type { AllConfigs } from '../types/enteteConfig';

const STORAGE_KEY = 'entetesConfig';

const defaultConfigs: AllConfigs = {
  eleves: {
    header: 'Liste des élèves',
    footer: "Signature du Directeur",
    logo: '',
    logoMinistere: '',
    pays: 'République de Côte d\'Ivoire',
    ministere: "Ministère de l'Éducation Nationale et de l'Alphabétisation",
    etablissement: 'Nom de l\'établissement',
    columns: ['Matricule', 'Nom & Prénom', 'Date de naissance'],
    mention: false,
  },
  recu: {
    header: 'Reçu de paiement',
    footer: "Aucun remboursement n'est possible après encaissement.",
    logo: '',
    columns: ['Nom', 'Montant', 'Date', 'Classe']
  },
  transport: {
    header: 'Fiche de renseignement transport',
    footer: '',
    logo: '',
    columns: ['Nom', 'Classe', 'Montant', 'Versement']
  }
};

export function getAllEnteteConfig(): AllConfigs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AllConfigs;
  } catch (_e) { void _e; }
  return defaultConfigs;
}

export function getEnteteConfig<K extends keyof AllConfigs>(type: K) {
  const all = getAllEnteteConfig();
  return all[type];
}

export function saveEnteteConfig(configs: AllConfigs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}
