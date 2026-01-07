import { db } from './database';
import { Eleve, Classe, Ecole } from '../types';

/**
 * Utility to initialize academic history for existing students
 * This should be run once when upgrading to the system with academic tracking
 */
export function initializeAcademicHistoryForExistingStudents() {
  const eleves = db.getAll<Eleve>('eleves');
  const classes = db.getAll<Classe>('classes');
  const ecole = db.getAll<Ecole>('ecole')[0];
  
  if (!ecole) {
    console.warn('No school configured');
    return { created: 0, skipped: 0 };
  }

  const anneeScolaireActive = ecole.anneeScolaireActive;
  let created = 0;
  let skipped = 0;

  eleves.forEach(eleve => {
    // Only create for active students with a valid class
    if (eleve.statut !== 'Actif' || !eleve.classeId) {
      skipped++;
      return;
    }

    const classe = classes.find(c => c.id === eleve.classeId);
    if (!classe) {
      skipped++;
      return;
    }

    // Check if there's already a parcours entry for this year
    const existingParcours = db.getAll<any>('parcoursAcademiques').filter(
      p => p.eleveId === eleve.id && p.anneeScolaire === anneeScolaireActive
    );

    if (existingParcours.length > 0) {
      skipped++;
      return;
    }

    // Create an "En cours" entry for the current year
    db.addParcoursAcademique({
      eleveId: eleve.id,
      anneeScolaire: anneeScolaireActive,
      classeId: classe.id,
      niveau: classe.niveau,
      section: classe.section || '',
      statut: 'En cours',
      dateDebut: eleve.anneeEntree || anneeScolaireActive,
      observations: 'Initialisé automatiquement lors de la migration'
    });

    created++;
  });

  db.addHistorique({
    type: 'autre',
    cible: 'Système',
    description: `Initialisation du parcours académique: ${created} entrées créées, ${skipped} élèves ignorés`,
    utilisateur: 'SYSTEM'
  });

  return { created, skipped };
}
