import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../database';
import { echeancesManager } from '../echeancesManager';

// Small in-memory fixture helper -> uses the LocalDatabase which writes to localStorage.
beforeEach(() => {
  // reset DB collections used in tests
  db.resetData();
});

describe('EcheancesManager', () => {
  it('allows partial allocation on non-inscription échéance', () => {
    // create classe
    const classe = db.create('classes', { niveau: 'CP1', section: 'A', anneeScolaire: '2025-2026' } as any);
    // create fraisScolaire with 2 échéances: inscription modalite=1 montant 10000, versement modalite=2 montant 20000
    void db.create('fraisScolaires', {
      niveau: 'CP1',
      anneeScolaire: '2025-2026',
      echeances: [
        { id: 'e1', modalite: 1, label: 'Inscription', date: new Date().toISOString(), montant: 10000 },
        { id: 'e2', modalite: 2, label: 'Versement 1', date: new Date().toISOString(), montant: 20000 }
      ]
    } as any);

    const eleve = db.create('eleves', { nom: 'Test', prenoms: 'Eleve', classeId: classe.id, matricule: '250001' } as any);

    // Pay 5000 toward versement (modalite 2) using selectedEcheances
    const res = echeancesManager.processPaymentIntelligent(eleve.id, 5000, new Date().toISOString(), { selectedEcheances: ['CP1-2', 'e2'] });
    expect(res.allocations.some(a => a.echeanceId === 'e2' && a.montant === 5000)).toBe(true);
  });

  it('rejects insufficient inscription payment for protege', () => {
    const classe = db.create('classes', { niveau: 'CM2', section: 'B', anneeScolaire: '2025-2026' } as any);
    void db.create('fraisScolaires', {
      niveau: 'CM2',
      anneeScolaire: '2025-2026',
      echeances: [
        { id: 'i1', modalite: 1, label: 'Inscription', date: new Date().toISOString(), montant: 15000 },
        { id: 'v1', modalite: 2, label: 'Versement', date: new Date().toISOString(), montant: 10000 }
      ]
    } as any);

    const eleve = db.create('eleves', { nom: 'Prot', prenoms: 'Eleve', classeId: classe.id, matricule: '250002', protege: true } as any);

    expect(() => {
      echeancesManager.processPaymentIntelligent(eleve.id, 5000, new Date().toISOString(), { selectedEcheances: ['CM2-2', 'v1'] });
    }).toThrow();

    // Also test that paying full inscription works
    const ok = echeancesManager.processPaymentIntelligent(eleve.id, 15000, new Date().toISOString(), { selectedEcheances: ['i1'] });
    expect(ok.allocations.some(a => a.echeanceId === 'i1' && a.montant === 15000)).toBe(true);
  });
});
