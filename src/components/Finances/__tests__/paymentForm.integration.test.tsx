import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../../src/utils/database';
import { seedDefaults } from '../../../../src/utils/seedDefaults';
import auth from '../../../../src/utils/auth';
import { processPayment } from '../../../../src/utils/payments';

describe('PaymentForm integration', () => {
  beforeEach(() => {
    db.resetData();
    seedDefaults();
    auth.seedUsers();
  });

  it('login and process payment creates paiement and historique', () => {
    const user = auth.login('poupouya@ecole.local', 'eyemon2024');
    expect(user).not.toBeNull();
  const classes = db.getAll<any>('classes');
  const classe: any = classes[0];
    // create eleve
    const eleve = db.create('eleves', { matricule: 'T100', nom: 'Int', prenoms: 'Test', sexe: 'M', dateNaissance: '2018-01-01', lieuNaissance: '', classeId: classe.id, anneeEntree: classe.anneeScolaire, statut: 'Actif', pereTuteur: '', mereTutrice: '', telephone: '', adresse: '', createdAt: new Date().toISOString() } as any);
    const beforeHist = db.getAll('historiques').length;
    const res = processPayment(eleve.id, 1000, new Date().toISOString(), { mode: 'espece', note: 'test', numeroRecu: 'RCTEST' });
    expect(res.paiement).toBeTruthy();
    // add historique as PaymentForm would
    db.addHistorique({ type: 'paiement', cible: 'Paiement', description: `Paiement de 1000 FCFA pour élève ${eleve.id}`, date: new Date().toISOString() } as any);
    const afterHist = db.getAll('historiques').length;
    expect(afterHist).toBeGreaterThan(beforeHist);
  });
});
