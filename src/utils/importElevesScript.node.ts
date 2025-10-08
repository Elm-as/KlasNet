
import ExcelJS from 'exceljs';
import { db } from './database';
import { Eleve } from '../types';

// (niveauMap removed — not used)

function cleanString(str: string | undefined): string {
  return (str || '').toString().trim();
}

async function importElevesDepuisFichierExcel(filePath: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  const rows: any[][] = [];
  sheet.eachRow((row: any) => rows.push(row.values ? row.values.slice(1) : []));
  const [headerRaw, ...body] = rows;
  const header: string[] = Array.isArray(headerRaw) ? headerRaw.map(h => String(h)) : [];

  // Index des colonnes utiles
  const idx = {
    matricule: header.findIndex(h => h.toLowerCase().includes('matricule')),
    nom: header.findIndex(h => h.toLowerCase().includes('nom')),
    prenom: header.findIndex(h => h.toLowerCase().includes('prénom')),
    sexe: header.findIndex(h => h.toLowerCase().includes('sexe')),
    dateNaissance: header.findIndex(h => h.toLowerCase().includes('nais')),
    lieu: header.findIndex(h => h.toLowerCase().includes('lieu')),
    niveau: header.findIndex(h => h.toLowerCase().includes('niv')),
    annee: header.findIndex(h => h.toLowerCase().includes('annee')),
    statut: header.findIndex(h => h.toLowerCase().includes('statut')),
    dateEntree: header.findIndex(h => h.toLowerCase().includes('entr')),
  };

  let countAjoutes = 0, countMaj = 0;
  for (const row of body) {
    const matricule = cleanString(row[idx.matricule]);
    const nom = cleanString(row[idx.nom]);
    const prenoms = cleanString(row[idx.prenom]);
    const sexe = cleanString(row[idx.sexe]) || 'M';
    const dateNaissance = cleanString(row[idx.dateNaissance]);
    const lieuNaissance = cleanString(row[idx.lieu]);
  const anneeEntree = cleanString(row[idx.annee]) || new Date().getFullYear().toString();
  const statutRaw = cleanString(row[idx.statut]) || 'Actif';
  const statut: Eleve['statut'] = statutRaw === 'Inactif' ? 'Inactif' : statutRaw === 'Transféré' ? 'Transféré' : 'Actif';

    if (!nom || !prenoms) continue;

    // Recherche d'un doublon (matricule ou nom/prénoms/date naissance)
    const allEleves = db.getAll<Eleve>('eleves');
    let exist = null;
    if (matricule) {
      exist = allEleves.find(e => e.matricule === matricule);
    }
    if (!exist) {
      exist = allEleves.find(e =>
        e.nom.toLowerCase() === nom.toLowerCase() &&
        e.prenoms.toLowerCase() === prenoms.toLowerCase() &&
        (!dateNaissance || e.dateNaissance === dateNaissance)
      );
    }

    const eleveData: Partial<Eleve> = {
      matricule: matricule || db.generateMatricule(),
      nom,
      prenoms,
      sexe: sexe === 'F' ? 'F' : 'M',
      dateNaissance,
      lieuNaissance,
      classeId: '', // à lier manuellement si besoin
      anneeEntree,
      statut,
      pereTuteur: '',
      mereTutrice: '',
      telephone: '',
      adresse: '',
      photo: '',
    };

    if (exist) {
      db.update<Eleve>('eleves', exist.id, eleveData as Partial<Eleve>);
      countMaj++;
    } else {
      const now = new Date().toISOString();
      const toCreate = Object.assign({}, eleveData, { createdAt: now, updatedAt: now }) as any;
      db.create<Eleve>('eleves', toCreate);
      countAjoutes++;
    }
  }
  console.log(`Import terminé : ${countAjoutes} ajoutés, ${countMaj} mis à jour.`);
}

// Pour exécution directe en Node
if (require.main === module) {
  const path = process.argv[2];
  if (!path) {
    console.error('Usage : node importElevesScript.js chemin/vers/fichier.xlsx');
    process.exit(1);
  }
  importElevesDepuisFichierExcel(path).catch(err => {
    console.error('Erreur:', err);
    process.exit(1);
  });
}
