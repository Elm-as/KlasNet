import { db } from './database';
import { Eleve, Classe, FraisScolaire, Paiement } from '../types';

export interface EcheanceStatus {
  echeanceId: string;
  modalite: number;
  label: string;
  date: string;
  montant: number;
  montantPaye: number;
  montantRestant: number;
  isEchue: boolean;
  joursRetard: number;
}

export interface SituationEcheances {
  eleveId: string;
  eleve: Eleve;
  classe: Classe | null;
  echeances: EcheanceStatus[];
  totalDu: number;
  totalPaye: number;
  totalRestant: number;
  echeancesEchues: EcheanceStatus[];
  prochainEcheance: EcheanceStatus | null;
}

export class EcheancesManager {
  private static instance: EcheancesManager;
  
  static getInstance(): EcheancesManager {
    if (!EcheancesManager.instance) {
      EcheancesManager.instance = new EcheancesManager();
    }
    return EcheancesManager.instance;
  }

  // Annuler un paiement : marquer comme annulé et ajouter historique
  cancelPayment(paiementId: string, reason?: string) {
    const paiement = db.getById<any>('paiements', paiementId);
    if (!paiement) throw new Error('Paiement introuvable');

    // If the paiement had an 'avance' (credit) we try to remove corresponding credit(s)
    try {
      const avance = Number(paiement.avance || 0);
      if (avance > 0) {
        // Find credits for this student with same montant (or close) and remove them.
        const credits = db.getAll<any>('credits').filter((c: any) => c.eleveId === paiement.eleveId && Math.abs(Number(c.montant || 0) - avance) < 1);
        credits.forEach((c: any) => db.delete('credits', c.id));
      }
    } catch (e) {
      // ignore credit cleanup errors
    }

    // Mark as canceled and keep record (soft-delete). Save reason if provided.
    const updateData: any = { canceled: true, updatedAt: new Date().toISOString() };
    if (reason) updateData.cancelNote = reason;
    db.update('paiements', paiementId, updateData as any);

    // Ajouter historique d'annulation (inclure le motif si fourni)
    db.addHistorique({
      type: 'autre',
      cible: 'Paiement',
      cibleId: paiementId,
      description: `Annulation du paiement ${paiementId} de ${paiement.montant} FCFA${reason ? ` — Motif: ${reason}` : ''}`,
      utilisateur: (paiement && paiement.operateur) || 'SYSTEM'
    });

    return true;
  }

  // Calculer la situation des échéances pour un élève
  getSituationEcheances(eleveId: string): SituationEcheances | null {
    const eleve = db.getById<Eleve>('eleves', eleveId);
    if (!eleve) return null;

    const classe = db.getById<Classe>('classes', eleve.classeId);
    if (!classe) return null;

    const frais = db.getAll<FraisScolaire>('fraisScolaires').find(f => 
      f.niveau === classe.niveau && f.anneeScolaire === classe.anneeScolaire
    );
    if (!frais || !frais.echeances) return null;

  const paiements = db.getAll<Paiement>('paiements').filter(p => p.eleveId === eleveId && !p.canceled);
    const today = new Date();

    // Calculer le montant payé par modalité
    const montantParModalite: Record<number, number> = {};
    
    paiements.forEach(paiement => {
      if (paiement.allocations && paiement.allocations.length > 0) {
        // Utiliser les allocations si disponibles. On accepte les deux formes
        // d'identifiant d'échéance : l'id explicite (e.id) ou l'id fallback
        // généré `${classe.niveau}-${modalite}` qui est utilisé ailleurs.
        paiement.allocations.forEach(allocation => {
          const echeance = frais.echeances!.find(e => {
            // correspondance sur id explicite
            if (e.id && e.id === allocation.echeanceId) return true;
            // correspondance sur id fallback utilisé par le code (niveau-modalite)
            if (`${classe.niveau}-${e.modalite}` === allocation.echeanceId) return true;
            return false;
          });
          if (echeance && echeance.modalite != null) {
            montantParModalite[echeance.modalite] = (montantParModalite[echeance.modalite] || 0) + allocation.montant;
          }
        });
      } else {
        // Fallback : utiliser le type de frais et modalité
        const anyPaiement = paiement as any;
        let modalite: number | null = null;

        if (anyPaiement.modalite) {
          modalite = Number(anyPaiement.modalite);
        } else if (anyPaiement.typeFrais === 'inscription') {
          modalite = 1;
        } else if (anyPaiement.typeFrais === 'scolarite' && anyPaiement.versementIndex) {
          modalite = Number(anyPaiement.versementIndex) + 1;
        }

        if (modalite) {
          montantParModalite[modalite] = (montantParModalite[modalite] || 0) + paiement.montant;
        }
      }
    });

    // Créer le statut de chaque échéance
    const echeances: EcheanceStatus[] = frais.echeances.map(echeance => {
      const montantPaye = montantParModalite[echeance.modalite || 0] || 0;
      const montantRestant = Math.max(0, echeance.montant - montantPaye);
      const dateEcheance = new Date(echeance.date);
      const isEchue = dateEcheance < today && montantRestant > 0;
      const joursRetard = isEchue ? Math.floor((today.getTime() - dateEcheance.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      // Générer le label correct selon la modalité
      let defaultLabel = `Versement ${echeance.modalite}`;
      if (echeance.modalite === 1) {
        defaultLabel = 'Inscription';
      } else if (echeance.modalite && echeance.modalite > 1) {
        defaultLabel = `Versement ${echeance.modalite - 1}`;
      }

      return {
        echeanceId: echeance.id || `${classe.niveau}-${echeance.modalite}`,
        modalite: echeance.modalite || 0,
        label: echeance.label || defaultLabel,
        date: echeance.date,
        montant: echeance.montant,
        montantPaye,
        montantRestant,
        isEchue,
        joursRetard
      };
    });

    const totalDu = echeances.reduce((sum, e) => sum + e.montant, 0);
    const totalPaye = echeances.reduce((sum, e) => sum + e.montantPaye, 0);
    const totalRestant = echeances.reduce((sum, e) => sum + e.montantRestant, 0);
    const echeancesEchues = echeances.filter(e => e.isEchue);
    const prochainEcheance = echeances
      .filter(e => e.montantRestant > 0 && !e.isEchue)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] || null;

    return {
      eleveId,
      eleve,
      classe,
      echeances,
      totalDu,
      totalPaye,
      totalRestant,
      echeancesEchues,
      prochainEcheance
    };
  }

  // Obtenir toutes les alertes d'échéances
  getAlertesEcheances(leadDays = 12): {
    echeancesImpayees: Array<{ eleve: Eleve; echeances: EcheanceStatus[]; totalDu: number }>;
  } {
    const eleves = db.getAll<Eleve>('eleves').filter(e => e.statut === 'Actif');
    const today = new Date();
    const echeancesImpayees: Array<{ eleve: Eleve; echeances: EcheanceStatus[]; totalDu: number }> = [];

    eleves.forEach(eleve => {
      const situation = this.getSituationEcheances(eleve.id);
      if (!situation) return;

      const unpaidEcheances = situation.echeances.filter(e => e.montantRestant > 0);
      if (unpaidEcheances.length === 0) return;

      // Vérifier s'il y a au moins une échéance qui peut être convoquée
      // (échéance dans les leadDays jours ou déjà échue)
      const hasConvocableEcheance = unpaidEcheances.some(e => {
        const echeanceDate = new Date(e.date);
        const joursRestants = Math.ceil((echeanceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return joursRestants <= leadDays; // Inclut les échéances passées et futures dans les leadDays
      });

      if (hasConvocableEcheance) {
        // Inclure seulement les échéances passées ET celles proches (dans les 12 jours)
        const echeancesAConvoquer = unpaidEcheances.filter(e => {
          const echeanceDate = new Date(e.date);
          const joursRestants = Math.ceil((echeanceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          // Inclure les échéances passées (joursRestants <= 0) ET les échéances futures dans les leadDays
          return joursRestants <= leadDays;
        });
        
        const totalDu = echeancesAConvoquer.reduce((sum, e) => sum + e.montantRestant, 0);
        echeancesImpayees.push({
          eleve,
          echeances: echeancesAConvoquer, // Seulement les échéances passées et proches
          totalDu
        });
      }
    });

    return { echeancesImpayees };
  }

  // Traiter un paiement intelligent avec allocation automatique
  processPaymentIntelligent(eleveId: string, montant: number, date: string, meta: Record<string, any> = {}) {
    const situation = this.getSituationEcheances(eleveId);
    if (!situation) throw new Error('Impossible de calculer la situation des échéances');

    let montantRestant = montant;
    const allocations: Array<{ echeanceId: string; montant: number }> = [];

    // Determine target échéances: if meta.selectedEcheances is provided, only allocate to those
    const selectedIds: string[] | undefined = Array.isArray(meta.selectedEcheances) ? meta.selectedEcheances : undefined;

    const allEcheances = situation.echeances.filter(e => e.montantRestant > 0);
    const filteredEcheances = selectedIds && selectedIds.length > 0
      ? allEcheances.filter(e => selectedIds.includes(e.echeanceId))
      : allEcheances;

    // Allouer d'abord aux échéances échues (par ordre chronologique), puis aux autres (filtrées)
    const echeancesATraiter = [
      ...filteredEcheances.filter(e => e.isEchue).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      ...filteredEcheances.filter(e => !e.isEchue).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    ];

    const eleveProtege = !!situation.eleve?.protege;
    // If the student is protected and selectedIds exists, ensure all selected are modalite 1
    if (eleveProtege && selectedIds && selectedIds.length > 0) {
      const nonInscription = filteredEcheances.find(e => e.modalite !== 1);
      if (nonInscription) {
        throw new Error("Élève protégé : seules les échéances d'inscription (modalité 1) peuvent être réglées");
      }
      const inscriptionRestant = filteredEcheances.reduce((sum, e) => sum + (e.modalite === 1 ? e.montantRestant : 0), 0);
      if (montant < inscriptionRestant) {
        throw new Error("Élève protégé : l'inscription doit être réglée en totalité");
      }
    } else if (eleveProtege && (!selectedIds || selectedIds.length === 0)) {
      // no explicit selection: require montant covers inscription total
      const inscriptionRestant = situation.echeances
        .filter(e => e.modalite === 1)
        .reduce((sum, e) => sum + e.montantRestant, 0);
      if (montant < inscriptionRestant) {
        throw new Error("Élève protégé : l'inscription doit être réglée en totalité");
      }
    }

    for (const echeance of echeancesATraiter) {
      if (montantRestant <= 0) break;
      if (echeance.montantRestant <= 0) continue;

      // If this is an inscription échéance, do not allow partial allocation
      if (echeance.modalite === 1) {
        if (montantRestant < echeance.montantRestant) {
          throw new Error("L'inscription doit être réglée en totalité");
        }
        // allocate full inscription
        allocations.push({ echeanceId: echeance.echeanceId, montant: echeance.montantRestant });
        montantRestant -= echeance.montantRestant;
        continue;
      }

      // For other modalities allow partial allocation
      const montantAAllouer = Math.min(montantRestant, echeance.montantRestant);
      allocations.push({ echeanceId: echeance.echeanceId, montant: montantAAllouer });
      montantRestant -= montantAAllouer;
    }

    // Créer le paiement avec allocations
    const paiementData: Omit<Paiement, 'id' | 'createdAt'> = {
      eleveId,
      montant,
      datePaiement: date,
      typeFrais: (meta && meta.typeFrais) || 'scolarite',
      versementIndex: (meta && meta.versementIndex) || undefined,
      modePaiement: (meta && meta.modePaiement) || 'Espèces',
      numeroRecu: (meta && meta.numeroRecu) || `REC-${Date.now()}`,
      operateur: (meta && meta.operateur) || 'SYSTEM',
      notes: (meta && meta.notes) || '',
      allocations,
      avance: montantRestant,
      updatedAt: new Date().toISOString()
    };

    const paiement = db.create<Paiement>('paiements', paiementData as any);

    return {
      paiement,
      allocations,
      avance: montantRestant,
      situation: this.getSituationEcheances(eleveId) // Situation mise à jour
    };
  }

  // Générer les convocations pour les échéances impayées proches
  generateConvocations(leadDays = 12): Array<{
    eleve: Eleve;
    classe: Classe;
    echeancesEchues: EcheanceStatus[];
    totalDu: number;
    anneeScolaire: string;
  }> {
    const alertes = this.getAlertesEcheances(leadDays);

    return alertes.echeancesImpayees.map(alerte => ({
      eleve: alerte.eleve,
      classe: db.getById<Classe>('classes', alerte.eleve.classeId)!,
      echeancesEchues: alerte.echeances,
      totalDu: alerte.totalDu,
      anneeScolaire: db.getById<Classe>('classes', alerte.eleve.classeId)?.anneeScolaire || ''
    }));
  }
}

export const echeancesManager = EcheancesManager.getInstance();
