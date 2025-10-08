import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../database';
import { echeancesManager } from '../echeancesManager';

beforeEach(() => {
  db.resetData();
});

describe('EcheancesManager cancel', () => {
  it('marks paiement canceled and removes matching credit when present', () => {
    const classe = db.create('classes', { niveau: 'CP2', section: 'A', anneeScolaire: '2025-2026' } as any);
    void db.create('fraisScolaires', {
      niveau: 'CP2', anneeScolaire: '2025-2026', echeances: [ { id: 'i1', modalite: 1, date: new Date().toISOString(), montant: 10000 } ]
    } as any);

    const eleve = db.create('eleves', { nom: 'Ann', prenoms: 'Test', classeId: classe.id, matricule: '250003' } as any);

    // Create a payment with avance (overpay) so a credit will be created manually to simulate previous behavior
    const payment = db.create('paiements', { eleveId: eleve.id, montant: 20000, datePaiement: new Date().toISOString(), typeFrais: 'scolarite', modePaiement: 'Espèces', numeroRecu: 'TST', operateur: 'TEST', notes: '', allocations: [], avance: 10000, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as any);

    // Create a corresponding credit that would have been created
  db.create('credits', { eleveId: eleve.id, montant: 10000, date: new Date().toISOString(), createdAt: new Date().toISOString() } as any);

    // Cancel the payment
    const res = echeancesManager.cancelPayment(payment.id);
    expect(res).toBe(true);

    const p = db.getById<any>('paiements', payment.id);
    expect(p).not.toBeNull();
    expect(p.canceled).toBe(true);

    // The credit should have been removed by cancelPayment implementation
    const remainingCredits = db.getAll('credits').filter((c: any) => c.eleveId === eleve.id && c.montant === 10000);
    expect(remainingCredits.length).toBe(0);
  });
});
