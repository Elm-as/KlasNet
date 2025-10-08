import { db } from './database';

type Echeance = { modalite: number; label: string; date: string; montant: number; id: string };

function parseStartYear(annee: string) {
  const parts = annee.split('-');
  const y = parseInt(parts[0], 10);
  return isNaN(y) ? new Date().getFullYear() : y;
}

export function getDefaultFraisForNiveau(niveau: string, annee: string) {
  const start = parseStartYear(annee);
  const next = start + 1;

  // Dates des modalités
  const dates = [
    `${start}-09-01`, // inscription (septembre)
    `${start}-10-05`, // 1er versement
    `${start}-11-05`, // 2e
    `${start}-12-05`, // 3e
    `${next}-01-05`, // 4e
    `${next}-02-05`, // 5e
    `${next}-03-05`, // 6e
  ];

  // Montants selon la structure fournie
  let inscription = 35000;
  let v1 = 15000;
  let v2 = 15000;
  
  // Maternelles (PS, MS, GS) : 100 000 FCFA
  if (['Petite Section', 'Moyenne Section', 'Grande Section'].includes(niveau)) {
    inscription = 35000;
    v1 = 15000;
    v2 = 10000; // Versement 2 réduit pour maternelles
  }
  
  // CP1, CP2, CE1, CE2 : 105 000 FCFA
  if (['CP1', 'CP2', 'CE1', 'CE2'].includes(niveau)) {
    inscription = 35000;
    v1 = 15000;
    v2 = 15000; // Versement 2 standard
  }
  
  // CM1 : 110 000 FCFA
  if (niveau === 'CM1') {
    inscription = 35000;
    v1 = 20000; // Versement 1 augmenté
    v2 = 15000;
  }
  
  // CM2 : 120 000 FCFA (inclut frais d'examen)
  if (niveau === 'CM2') {
    inscription = 45000; // Inscription + frais d'examen
    v1 = 20000; // Versement 1 augmenté
    v2 = 15000;
  }

  // Build echeances array (modalite numbering 1..7)
  const echeances: Echeance[] = [
    { modalite: 1, label: 'Inscription', date: dates[0], montant: inscription, id: `${niveau}-1` },
    { modalite: 2, label: 'Versement 1', date: dates[1], montant: v1, id: `${niveau}-2` },
    { modalite: 3, label: 'Versement 2', date: dates[2], montant: v2, id: `${niveau}-3` },
    { modalite: 4, label: 'Versement 3', date: dates[3], montant: 10000, id: `${niveau}-4` },
    { modalite: 5, label: 'Versement 4', date: dates[4], montant: 10000, id: `${niveau}-5` },
    { modalite: 6, label: 'Versement 5', date: dates[5], montant: 10000, id: `${niveau}-6` },
    { modalite: 7, label: 'Versement 6', date: dates[6], montant: 10000, id: `${niveau}-7` },
  ];

  const total = echeances.reduce((s, e) => s + e.montant, 0);

  return {
    niveau,
    anneeScolaire: annee,
    montant: total,
    fraisInscription: 0,
    echeances: echeances.map(e => ({ 
      date: e.date, 
      montant: e.montant, 
      modalite: e.modalite, 
      label: e.label,
      id: e.id 
    }))
  };
}

const NIVEAUX = [
  'Petite Section','Moyenne Section','Grande Section',
  'CP1','CP2','CE1','CE2','CM1','CM2'
];

export function ensureDefaultFrais(annee: string) {
  const existing = db.getAll<any>('fraisScolaires') || [];
  
  // Migration: convert legacy 'annee' property to 'anneeScolaire' if present
  existing.forEach((f: any) => {
    if (f && f.annee && !f.anneeScolaire) {
      try {
        db.update('fraisScolaires', f.id, { ...f, anneeScolaire: f.annee, updatedAt: new Date().toISOString() });
      } catch (err) {
        // ignore migration errors
      }
    }
  });
  
  let created = 0;
  NIVEAUX.forEach(niveau => {
    const found = (db.getAll<any>('fraisScolaires') || []).find((f: any) => f.niveau === niveau && f.anneeScolaire === annee);
    if (!found) {
      const payload = getDefaultFraisForNiveau(niveau, annee);
      db.create('fraisScolaires', payload);
      created++;
    }
  });
  return created;
}

// Fonction pour initialiser les frais par défaut au démarrage
export function initializeDefaultFrais() {
  const anneeActive = '2025-2026';
  const created = ensureDefaultFrais(anneeActive);
  if (created > 0) {
    console.log(`Frais scolaires initialisés: ${created} niveaux créés pour ${anneeActive}`);
  }
  return created;
}
