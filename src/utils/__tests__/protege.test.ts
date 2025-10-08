import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../utils/database';
import { echeancesManager } from '../echeancesManager';

// Very small integration-style test using the in-memory db used by the app.
// It creates an eleve protégé with a couple of échéances and attempts to pay a non-inscription modalité.

describe('Protégé payment rules', () => {
  beforeEach(() => {
    // Reset DB collections used by deleting items one by one
    try { db.getAll('eleves').forEach((i: any) => db.delete('eleves', i.id)); } catch (e) { /* ignore */ }
    try { db.getAll('paiements').forEach((i: any) => db.delete('paiements', i.id)); } catch (e) { /* ignore */ }
    try { db.getAll('fraisScolaires').forEach((i: any) => db.delete('fraisScolaires', i.id)); } catch (e) { /* ignore */ }
  });

  it('should prevent paying non-inscription modalities for a protégé', () => {
    // Create eleve protégé
    const eleve = {
      id: 'E-TEST-1',
      matricule: 'TEST001',
      nom: 'Test',
      prenoms: 'Protégé',
      sexe: 'M',
      dateNaissance: '2010-01-01',
      lieuNaissance: 'Ville',
      classeId: 'C-1',
      anneeEntree: '2025',
      statut: 'Actif',
      pereTuteur: '',
      mereTutrice: '',
      telephone: '',
      adresse: '',
      photo: '',
      protege: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    db.create('eleves', eleve);

    // Add a fake frais scolaire with multiple échéances
    const frais = {
      id: 'F-1',
      niveau: 'CP1',
      anneeScolaire: '2025',
      fraisInscription: 35000,
      fraisScolarite: 70000,
      echeances: [
        { id: 'E1', date: '2025-09-01', montant: 35000, modalite: 1, label: 'Inscription' },
        { id: 'E2', date: '2025-10-05', montant: 15000, modalite: 2, label: 'Versement 1' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    db.create('fraisScolaires', frais);

    // Build a situation: processPaymentIntelligent should throw if asked to pay a non-inscription for a protege
    const attempt = () => {
      // try to pay modalite 2 for protege
      echeancesManager.processPaymentIntelligent(eleve.id, 15000, new Date().toISOString(), { selectedEcheances: ['E2'] } as any);
    };

    expect(attempt).toThrow();
  });
});
