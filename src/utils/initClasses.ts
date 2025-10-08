import { db } from './database';
import { Classe } from '../types';

const niveaux = [
  'Petite Section',
  'Moyenne Section',
  'Grande Section',
  'CP1',
  'CP2',
  'CE1',
  'CE2',
  'CM1',
  'CM2',
];

const anneeScolaire = new Date().getFullYear() + '-' + (new Date().getFullYear() + 1);

const classes: Omit<Classe, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Maternelles (une seule section)
  { niveau: 'Petite Section', section: 'A', anneeScolaire, enseignantPrincipal: '', effectifMax: 35, salle: '', matieres: [] },
  { niveau: 'Moyenne Section', section: 'A', anneeScolaire, enseignantPrincipal: '', effectifMax: 35, salle: '', matieres: [] },
  { niveau: 'Grande Section', section: 'A', anneeScolaire, enseignantPrincipal: '', effectifMax: 35, salle: '', matieres: [] },
  // Deux classes par niveau du primaire
  ...['CP1','CP2','CE1','CE2','CM1','CM2'].flatMap(niveau => [
    { niveau, section: 'A', anneeScolaire, enseignantPrincipal: '', effectifMax: 35, salle: '', matieres: [] },
    { niveau, section: 'B', anneeScolaire, enseignantPrincipal: '', effectifMax: 35, salle: '', matieres: [] },
  ])
];

classes.forEach(classe => {
  // Vérifier si la classe existe déjà (même niveau, section, année)
  const exist = db.getAll<Classe>('classes').find(c => c.niveau === classe.niveau && c.section === classe.section && c.anneeScolaire === classe.anneeScolaire);
  if (!exist) {
    db.create<Classe>('classes', classe);
  }
});

console.log('Classes initialisées !');