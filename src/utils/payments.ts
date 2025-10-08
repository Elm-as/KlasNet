import { db } from './database';
import { Eleve, FraisScolaire, Paiement, Allocation } from '../types';

type ScheduleItem = { echeanceId: string; date: string; montant: number; paid: number; remaining: number; modalite?: number; dueDate?: string };

export function computeScheduleForEleve(eleveId: string): ScheduleItem[] {
  const eleve = db.getById<Eleve>('eleves', eleveId);
  if (!eleve) throw new Error('Élève introuvable');
  const classe = db.getById('classes', eleve.classeId) as { niveau?: string; anneeScolaire?: string } | null;
  const ecole = db.getAll('ecole')[0] as { anneeScolaireActive?: string } | undefined;
  const niveau = classe?.niveau as string | undefined;
  const annee = classe?.anneeScolaire || eleve.anneeEntree || ecole?.anneeScolaireActive;
  if (!niveau || !annee) return [];
  const frais = db.getAll<FraisScolaire>('fraisScolaires').find(f => f.niveau === niveau && f.anneeScolaire === annee);
  if (!frais || !(frais.echeances && frais.echeances.length)) return [];

  return (frais.echeances || []).map((e: any, idx: number) => ({
    echeanceId: e.id || `${frais.niveau}-${idx + 1}`,
    date: e.date,
    montant: Number(e.montant || 0),
    paid: 0,
    remaining: Number(e.montant || 0),
    modalite: e.modalite,
    dueDate: e.date
  }));
}

export function processPayment(eleveId: string, amount: number, date: string, meta: Record<string, unknown> = {}) {
  let schedule = computeScheduleForEleve(eleveId);
  // If caller requested a preferred modalite, prioritize those schedule items first (preserve relative order)
  const preferredModalite = typeof (meta && (meta as any).modalite) !== 'undefined' ? Number((meta as any).modalite) : null;
  if (preferredModalite !== null) {
    const preferred: typeof schedule = [];
    const others: typeof schedule = [];
    for (const s of schedule) {
      if (Number(s.modalite) === preferredModalite) preferred.push(s);
      else others.push(s);
    }
    schedule = [...preferred, ...others];
  }
  let reste = Math.max(0, Number(amount));
  const allocations: Allocation[] = [];

  for (const s of schedule) {
    if (reste <= 0) break;
    if (s.remaining <= 0) continue;
    const take = Math.min(s.remaining, reste);
    s.paid += take;
    s.remaining -= take;
    reste -= take;
    allocations.push({ echeanceId: s.echeanceId, montant: take });
  }

  const paiementPayload: Partial<Paiement> = {
    eleveId,
    montant: amount,
    datePaiement: date,
    createdAt: new Date().toISOString(),
    allocations,
    avance: reste,
    ...meta
  };

  const paiement = db.create<Paiement>('paiements', paiementPayload as Paiement);

  if (reste > 0) {
    const creditPayload = { eleveId, montant: reste, date: new Date().toISOString(), createdAt: new Date().toISOString() };
    db.create('credits', creditPayload as any);
  }

  return { paiement, allocations, avance: reste };
}

export default { computeScheduleForEleve, processPayment };

// Utilitaire: vérifie si la modalité 1 (inscription) est payée pour un élève
export function isEleveInscrit(eleveId: string) {
  // Compute total paid for a given modalité using canonical mapping rules:
  // - paiement.typeFrais === 'inscription' -> modalite = 1
  // - paiement.typeFrais === 'scolarite' with versementIndex -> modalite = versementIndex + 1
  // - explicit paiement.modalite (meta) overrides
  const paiements = db.getAll<Paiement>('paiements').filter(p => p.eleveId === eleveId && !p.canceled);

  const totalForModalite = (modaliteNum: number) => {
    return paiements.reduce((sum, p) => {
      const anyP: any = p as any;
      let modalite: number | null = null;

      if (anyP.typeFrais === 'inscription') {
        modalite = 1;
      } else if (typeof anyP.modalite !== 'undefined' && anyP.modalite !== null) {
        modalite = Number(anyP.modalite);
      } else if (anyP.typeFrais === 'scolarite' && typeof anyP.versementIndex !== 'undefined') {
        // versementIndex is 1-based for V1..Vn; map V1 -> modalite 2
        modalite = Number(anyP.versementIndex) + 1;
      }

      if (modalite === modaliteNum) return sum + Number(p.montant || 0);
      return sum;
    }, 0);
  };

  const totalPayeModalite1 = totalForModalite(1);

  // Determine expected montant for modalité 1 from fraisScolaires (prefer explicit modalite field)
  let attenduModalite1 = 0;
  const eleve = db.getById<Eleve>('eleves', eleveId);
  const classe = eleve ? db.getById('classes', eleve.classeId) as any : null;
  const frais = classe ? db.getAll<FraisScolaire>('fraisScolaires').find(f => f.niveau === classe.niveau && f.anneeScolaire === classe.anneeScolaire) : null;
  if (frais && frais.echeances && frais.echeances.length) {
    const e1 = (frais.echeances as any[]).find((e: any) => Number(e.modalite) === 1);
    if (e1) attenduModalite1 = Number(e1.montant || 0);
    else attenduModalite1 = Number((frais.echeances[0] as any).montant || 0);
  }

  return Number(totalPayeModalite1 || 0) >= Number(attenduModalite1 || 0) && Number(attenduModalite1 || 0) > 0;
}