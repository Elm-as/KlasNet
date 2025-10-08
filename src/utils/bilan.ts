import { db } from './database';
import { Eleve, Note, Matiere, CompositionConfig, Classe, MoyenneEleve } from '../types';

export function calculerMoyenneComposition(eleveId: string, compositionId: string, classeId: string): number {
  const notes = db.getAll<Note>('notes').filter(n => 
    n.eleveId === eleveId && 
    n.compositionId === compositionId &&
    n.classeId === classeId
  );
  
  if (notes.length === 0) return 0;

  const classe = db.getAll<Classe>('classes').find(c => c.id === classeId);
  if (!classe) return 0;

  let totalPoints = 0;
  let totalCoefficients = 0;

  notes.forEach(note => {
    const matiere = classe.matieres.find(m => m.id === note.matiereId);
    if (matiere) {
      // Normaliser la note sur 20
      const noteNormalisee = (note.valeur / note.bareme) * 20;
      totalPoints += noteNormalisee * matiere.coefficient;
      totalCoefficients += matiere.coefficient;
    }
  });

  return totalCoefficients > 0 ? Math.round((totalPoints / totalCoefficients) * 100) / 100 : 0;
}

export function calculerMoyenneAnnuelle(eleve: Eleve, anneeScolaire?: string): number {
  const classe = db.getAll<Classe>('classes').find(c => c.id === eleve.classeId);
  if (!classe) return 0;

  const compositions = db.getAll<CompositionConfig>('compositions').filter(c =>
    !c.niveau || c.niveau === classe.niveau
  );

  if (compositions.length === 0) return 0;

  let totalPoints = 0;
  let totalCoefficients = 0;

  compositions.forEach(composition => {
    const moyenneComp = calculerMoyenneComposition(eleve.id, composition.id, classe.id);
    if (moyenneComp > 0) {
      totalPoints += moyenneComp * composition.coefficient;
      totalCoefficients += composition.coefficient;
    }
  });

  return totalCoefficients > 0 ? Math.round((totalPoints / totalCoefficients) * 100) / 100 : 0;
}

export function calculerRangClasse(classeId: string, compositionId: string): Array<{eleveId: string, moyenne: number, rang: number}> {
  const eleves = db.getAll<Eleve>('eleves').filter(e => 
    e.classeId === classeId && e.statut === 'Actif'
  );

  const elevesAvecMoyenne = eleves.map(eleve => ({
    eleveId: eleve.id,
    moyenne: calculerMoyenneComposition(eleve.id, compositionId, classeId)
  })).filter(e => e.moyenne > 0);

  // Trier par moyenne décroissante
  elevesAvecMoyenne.sort((a, b) => b.moyenne - a.moyenne);

  // Attribuer les rangs
  return elevesAvecMoyenne.map((eleve, index) => ({
    ...eleve,
    rang: index + 1
  }));
}

export function sauvegarderMoyennes(classeId: string, compositionId: string) {
  const rangs = calculerRangClasse(classeId, compositionId);
  
  rangs.forEach(({ eleveId, moyenne, rang }) => {
    const existingMoyenne = db.getAll<MoyenneEleve>('moyennesGenerales').find(m =>
      m.eleveId === eleveId &&
      m.compositionId === compositionId &&
      m.classeId === classeId
    );

    const moyenneData = {
      eleveId,
      classeId,
      compositionId,
      moyenne,
      rang,
      dateCalcul: new Date().toISOString()
    };

    if (existingMoyenne) {
  db.update('moyennesGenerales', existingMoyenne.id, moyenneData as any);
    } else {
  db.create('moyennesGenerales', moyenneData as any);
    }
  });
}