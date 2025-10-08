import { Eleve } from '../types';
import * as XLSX from 'xlsx';
import { db } from './database';
import payments from './payments';
import { formatNomPrenoms } from './formatName';
import { formatPrenomsNom } from './formatName';

// utility: remove accents, lower-case, collapse spaces
function normalizeString(s: string) {
  return s ? s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim() : '';
}

// simple Levenshtein distance (small inputs ok)
function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const v0 = new Array(bl + 1).fill(0);
  const v1 = new Array(bl + 1).fill(0);
  for (let i = 0; i <= bl; i++) v0[i] = i;
  for (let i = 0; i < al; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < bl; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let k = 0; k <= bl; k++) v0[k] = v1[k];
  }
  return v1[bl];
}

// Attempt to match an eleve using tolerant heuristics
function matchEleveTolerance(allEleves: Eleve[], rawName: string, rawClasse: string, rawContact?: string) {
  const nName = normalizeString(rawName || '');
  const nClasse = normalizeString(rawClasse || '');

  if (!nName) return null;

  // helper: build normalized class label for an eleve
  const classeLabelFor = (e: Eleve) => {
    const c = (db.getById('classes', e.classeId) as any) || {};
    return normalizeString(`${c.niveau || ''} ${c.section || ''}`.trim());
  };

  // Exact strong match: name (either order) + class contains
  let strong = allEleves.find(e => {
    const cand = normalizeString(formatNomPrenoms(e));
    const cand2 = normalizeString(formatPrenomsNom(e));
    const cl = classeLabelFor(e);
    const classeOk = !nClasse || cl.includes(nClasse) || nClasse.includes(cl);
    return classeOk && (cand === nName || cand2 === nName);
  });
  if (strong) return strong;

  // Name exact (either order) without class constraint
  let plain = allEleves.find(e => {
    const cand = normalizeString(formatNomPrenoms(e));
    const cand2 = normalizeString(formatPrenomsNom(e));
    return cand === nName || cand2 === nName;
  });
  if (plain) return plain;

  // Contains / token overlap: prefer candidates in the same class
  const nameTokens = nName.split(' ').filter(Boolean);
  const candidates: Array<{ e: Eleve; score: number; classMatch: boolean }> = [];
  for (const e of allEleves) {
    const cand = normalizeString(formatNomPrenoms(e));
    const cand2 = normalizeString(formatPrenomsNom(e));
    const cl = classeLabelFor(e);
    const classMatch = !!nClasse && (cl.includes(nClasse) || nClasse.includes(cl));
    // token overlap
    const candTokens = (cand.split(' ').filter(Boolean));
    const overlap = nameTokens.filter(t => candTokens.includes(t)).length;
    // also check reverse (candidate contains raw)
    const contains = cand.includes(nName) || nName.includes(cand) || cand2.includes(nName) || nName.includes(cand2);
    // phone heuristic: check if contact column digits appear in eleve fields
    let phoneMatch = 0;
    try {
      const phones = [String((e as any).telephone || ''), String((e as any).pereTuteur || ''), String((e as any).mereTutrice || '')].join(' ');
      const digitsInContact = (rawContact || '').replace(/\D/g, '');
      if (digitsInContact && digitsInContact.length >= 6 && phones.replace(/\D/g, '').includes(digitsInContact)) phoneMatch = 5; // strong boost
    } catch (_e) {}

    let score = overlap * 2 + (contains ? 3 : 0) + phoneMatch + (classMatch ? 4 : 0);
    // small boost for very short exact-ish matches
    if (overlap >= Math.max(1, Math.floor(nameTokens.length * 0.6))) score += 2;
    candidates.push({ e, score, classMatch });
  }

  // pick best scored candidate if score is significant
  candidates.sort((a, b) => b.score - a.score);
  if (candidates.length > 0 && candidates[0].score > 3) {
    return candidates[0].e;
  }

  // fallback fuzzy Levenshtein on full name; allow up to ~30% differences
  let best: { e?: Eleve; d?: number } = {};
  for (const e of allEleves) {
    const cand = normalizeString(formatNomPrenoms(e));
    const d = levenshtein(nName, cand);
    if (best.d === undefined || d < best.d) best = { e, d };
  }
  if (best.e && best.d !== undefined) {
    const len = Math.max(1, nName.length);
    if (best.d <= Math.max(1, Math.floor(len * 0.3))) return best.e as Eleve; // allow up to 30% differences
  }

  return null;
}

// Importer les élèves depuis un fichier Excel (xlsx ou xls) en utilisant SheetJS (xlsx)
export async function importerElevesDepuisExcel(file: File, mapping?: {
  matricule?: string;
  nom?: string;
  prenoms?: string;
  nomPrenoms?: string;
  moyenne?: string;
}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer | string;
        const workbook = XLSX.read(data, { type: typeof data === 'string' ? 'binary' : 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (!rows || rows.length === 0) {
          reject('Fichier Excel vide ou illisible');
          return;
        }

        const header = (rows[0] as any[]).map((h: any) => String(h || '').trim());
        const body = rows.slice(1) as any[][];

        if (!mapping) {
          resolve({ columns: header, preview: body.slice(0, 5) });
          return;
        }

        const matriculeIdx = mapping.matricule ? header.findIndex((h: string) => h === mapping.matricule) : -1;
        const nomIdx = mapping.nom ? header.findIndex((h: string) => h === mapping.nom) : -1;
        const prenomsIdx = mapping.prenoms ? header.findIndex((h: string) => h === mapping.prenoms) : -1;
        const nomPrenomsIdx = mapping.nomPrenoms ? header.findIndex((h: string) => h === mapping.nomPrenoms) : -1;

        // Matricule column is optional. If not found, we'll leave matricule empty and let caller/database generate one.

        const eleves: Eleve[] = body.map((row: any[]) => {
          let nom = '';
          let prenoms = '';
          if (nomPrenomsIdx !== -1) {
            const full = String(row[nomPrenomsIdx] || '').trim();
            const parts = full.split(' ');
            nom = parts[0] || '';
            prenoms = parts.slice(1).join(' ');
          } else {
            nom = nomIdx !== -1 ? String(row[nomIdx] || '').trim() : '';
            prenoms = prenomsIdx !== -1 ? String(row[prenomsIdx] || '').trim() : '';
          }
          return {
            id: '',
            matricule: matriculeIdx !== -1 ? String(row[matriculeIdx] || '').trim() : '',
            nom,
            prenoms,
            sexe: 'M',
            dateNaissance: '',
            lieuNaissance: '',
            classeId: '',
            anneeEntree: new Date().getFullYear().toString(),
            statut: 'Actif',
            pereTuteur: '',
            mereTutrice: '',
            telephone: '',
            adresse: '',
            photo: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as Eleve;
        });

        resolve(eleves);
      } catch (err) {
        reject(err instanceof Error ? err.message : String(err));
      }
    };
    reader.onerror = () => reject('Erreur lecture du fichier');
    reader.readAsArrayBuffer(file);
  });
}

// Exporter les élèves au format Excel (xlsx) en utilisant SheetJS
export async function exporterElevesEnExcel(eleves: Eleve[]) {
  const wsData = [
    ['Matricule', 'Nom & Prénoms', 'Moyenne'],
    ...eleves.map(e => [e.matricule, `${e.nom} ${e.prenoms}`, ''])
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Élèves');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return wbout as ArrayBuffer;
}

// Importer paiements depuis un fichier Excel. Détecte les colonnes mois (Inscription, Octobre...) et
// crée des paiements via payments.processPayment(eleveId, montant, date, meta)
export async function importerPaiementsDepuisExcel(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer | string;
        const workbook = XLSX.read(data, { type: typeof data === 'string' ? 'binary' : 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (!rows || rows.length === 0) {
          reject('Fichier Excel vide ou illisible');
          return;
        }

        const header = (rows[0] as any[]).map((h: any) => String(h || '').trim());
        const body = rows.slice(1) as any[][];

        // find key columns
        const nameIdx = header.findIndex(h => /nom/i.test(h) && /pr/i.test(h) || /nom\s*&\s*pr/i.test(h));
        const classeIdx = header.findIndex(h => /classe/i.test(h));
        const contactIdx = header.findIndex(h => /contact|tel/i.test(h));

        // detect month-like columns (inscription and months) and assign modalites
        const monthNames = ['inscription','octobre','novembre','décembre','decembre','janvier','février','fevrier','mars','avril','mai','juin','juillet','août','aout','septembre'];
        const monthCols: { idx: number; name: string; modalite: number }[] = [];
        const lowerHeaders = header.map(h => String(h || '').toLowerCase());
        const hasInscription = lowerHeaders.some(h => h.includes('inscription'));
        let nextModalite = hasInscription ? 2 : 1;
        header.forEach((h, i) => {
          const low = String(h || '').toLowerCase();
          if (monthNames.some(m => low.includes(m))) {
            if (low.includes('inscription')) {
              monthCols.push({ idx: i, name: String(h), modalite: 1 });
            } else {
              monthCols.push({ idx: i, name: String(h), modalite: nextModalite });
              nextModalite++;
            }
          }
        });

        if (!nameIdx && nameIdx !== 0) {
          // try looser match: first column
        }

  const applied: Array<{ row: number; eleveId: string; eleveName?: string; month: string; modalite?: number | null; montant: number }> = [];
  const unresolved: Array<{ row: number; name: string; classe: string; contact?: string }> = [];


        for (let r = 0; r < body.length; r++) {
          const row = body[r];
          const rawName = String(row[nameIdx] || '').trim();
          const rawClasse = String(row[classeIdx] || '').trim();
          const rawContact = contactIdx >= 0 ? String(row[contactIdx] || '').trim() : '';

          // normalized raw inputs (handled inside matchEleveTolerance)

          // find eleve with tolerant matching
          const eleves = db.getAll< Eleve>('eleves');
          let match = matchEleveTolerance(eleves, rawName, rawClasse, rawContact);

          if (!match) {
            unresolved.push({ row: r + 2, name: rawName, classe: rawClasse, contact: rawContact });
            continue;
          }

          // for each month column, if amount > 0, process payment
          for (const mc of monthCols) {
            const cell = row[mc.idx];
            if (!cell && cell !== 0) continue;
            // parse amount: remove non-digit characters
            const cleaned = String(cell).replace(/[^0-9]/g, '');
            if (!cleaned) continue;
            const montant = Number(cleaned);
            if (!montant || isNaN(montant) || montant <= 0) continue;

            // derive a date from column name (fallback) and determine modalite
            const now = new Date();
            let dateStr = now.toISOString();
            const low = String(mc.name || '').toLowerCase();
            const monthMap: Record<string, number> = { 'janvier':1,'fevrier':2,'février':2,'mars':3,'avril':4,'mai':5,'juin':6,'juillet':7,'août':8,'aout':8,'septembre':9,'octobre':10,'novembre':11,'décembre':12,'decembre':12 };
            for (const key in monthMap) {
              if (low.includes(key)) {
                const year = (new Date()).getFullYear();
                const m = monthMap[key];
                dateStr = new Date(year, m - 1, 1).toISOString();
                break;
              }
            }
            const modalite = (mc as any).modalite || null;
            try {
              payments.processPayment(match.id, montant, dateStr, { source: 'import', note: `Import ${mc.name}`, modalite, pereTelephone: rawContact });
              applied.push({ row: r + 2, eleveId: match.id, eleveName: formatNomPrenoms(match), month: mc.name, modalite, montant });
            } catch (err) {
              unresolved.push({ row: r + 2, name: rawName, classe: rawClasse, contact: rawContact });
            }
          }
        }

        resolve({ applied, unresolved });
      } catch (err) {
        reject(err instanceof Error ? err.message : String(err));
      }
    };
    reader.onerror = () => reject('Erreur lecture du fichier');
    reader.readAsArrayBuffer(file);
  });
}

// Preview: analyse le fichier et propose une liste de paiements sans les appliquer
export async function previewImporterPaiementsDepuisExcel(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer | string;
        const workbook = XLSX.read(data, { type: typeof data === 'string' ? 'binary' : 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (!rows || rows.length === 0) return resolve({ proposals: [], unresolved: [] });
        const header = (rows[0] as any[]).map((h: any) => String(h || '').trim());
        const body = rows.slice(1) as any[][];

        const nameIdx = header.findIndex(h => /nom/i.test(h) && /pr/i.test(h) || /nom\s*&\s*pr/i.test(h));
        const classeIdx = header.findIndex(h => /classe/i.test(h));
        const contactIdx = header.findIndex(h => /contact|tel/i.test(h));
        const monthNames = ['inscription','octobre','novembre','décembre','decembre','janvier','février','fevrier','mars','avril','mai','juin','juillet','août','aout','septembre'];
        const monthCols: { idx: number; name: string; modalite: number }[] = [];
        const lowerHeaders = header.map(h => String(h || '').toLowerCase());
        const hasInscription = lowerHeaders.some(h => h.includes('inscription'));
        let nextModalite = hasInscription ? 2 : 1;
        header.forEach((h, i) => {
          const low = String(h || '').toLowerCase();
          if (monthNames.some(m => low.includes(m))) {
            if (low.includes('inscription')) {
              monthCols.push({ idx: i, name: String(h), modalite: 1 });
            } else {
              monthCols.push({ idx: i, name: String(h), modalite: nextModalite });
              nextModalite++;
            }
          }
        });

        const proposals: Array<any> = [];
        const unresolved: Array<any> = [];

        for (let r = 0; r < body.length; r++) {
          const row = body[r];
          const rawName = String(row[nameIdx] || '').trim();
          const rawClasse = String(row[classeIdx] || '').trim();
          const rawContact = contactIdx >= 0 ? String(row[contactIdx] || '').trim() : '';

          const eleves = db.getAll< Eleve>('eleves');
          const match = matchEleveTolerance(eleves, rawName, rawClasse, rawContact);

          for (const mc of monthCols) {
            const cell = row[mc.idx];
            if (!cell && cell !== 0) continue;
            const cleaned = String(cell).replace(/[^0-9]/g, '');
            if (!cleaned) continue;
            const montant = Number(cleaned);
            if (!montant || isNaN(montant) || montant <= 0) continue;

            proposals.push({ row: r + 2, name: rawName, classe: rawClasse, contact: rawContact, month: mc.name, montant, modalite: mc.modalite, match: match ? { id: match.id, name: formatNomPrenoms(match) } : null });
          }
          if (!match) unresolved.push({ row: r + 2, name: rawName, classe: rawClasse, contact: rawContact });
        }

        resolve({ proposals, unresolved });
      } catch (err) {
        reject(err instanceof Error ? err.message : String(err));
      }
    };
    reader.onerror = () => reject('Erreur lecture du fichier');
    reader.readAsArrayBuffer(file);
  });
}

// Applique une liste de propositions de paiements (issue de previewImporterPaiementsDepuisExcel)
export async function applyPaiementsDepuisProposals(proposals: Array<any>) {
  const applied: Array<{ row: number; eleveId: string; month: string; montant: number }> = [];
  const unresolved: Array<any> = [];
  for (const p of proposals) {
    if (!p.match || !p.match.id) {
      unresolved.push(p);
      continue;
    }
    // derive date from month name roughly
    const now = new Date();
    let dateStr = now.toISOString();
    const low = String(p.month || '').toLowerCase();
    const monthMap: Record<string, number> = { 'janvier':1,'fevrier':2,'février':2,'mars':3,'avril':4,'mai':5,'juin':6,'juillet':7,'août':8,'aout':8,'septembre':9,'octobre':10,'novembre':11,'décembre':12,'decembre':12 };
    for (const key in monthMap) {
      if (low.includes(key)) {
        const year = (new Date()).getFullYear();
        const m = monthMap[key];
        dateStr = new Date(year, m - 1, 1).toISOString();
        break;
      }
    }
    try {
      const meta: any = { source: 'import', note: `Import ${p.month}` };
      if (typeof p.modalite !== 'undefined') meta.modalite = p.modalite;
      if (p.contact) meta.pereTelephone = p.contact;
      payments.processPayment(p.match.id, p.montant, dateStr, meta);
      applied.push({ row: p.row, eleveId: p.match.id, month: p.month, montant: p.montant });
    } catch (err) {
      unresolved.push(p);
    }
  }
  return { applied, unresolved };
}

// Fonction utilitaire pour parser le nom de classe (ex: "CP1 A" -> {niveau: "CP1", section: "A"})
function parseClasseName(classeName: string): { niveau: string; section: string } {
  const cleaned = String(classeName || '').trim();
  if (!cleaned) return { niveau: '', section: '' };
  
  // Patterns communs: "CP1 A", "CP1A", "CP 1 A", etc.
  const match = cleaned.match(/^([A-Z]+\s*\d*)\s*([A-Z]?)$/i);
  if (match) {
    const niveau = match[1].replace(/\s+/g, '').toUpperCase();
    const section = match[2] || 'A';
    return { niveau, section: section.toUpperCase() };
  }
  
  // Fallback: tout avant le dernier caractère = niveau, dernier = section
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) {
    const section = parts[parts.length - 1];
    const niveau = parts.slice(0, -1).join('').toUpperCase();
    return { niveau, section: section.toUpperCase() };
  }
  
  return { niveau: cleaned.toUpperCase(), section: 'A' };
}

// Fonction utilitaire pour trouver ou créer une classe
function findOrCreateClasse(niveau: string, section: string, anneeScolaire: string): string {
  const classes = db.getAll<any>('classes');
  
  // Chercher une classe existante
  const existing = classes.find(c => 
    c.niveau === niveau && 
    c.section === section && 
    c.anneeScolaire === anneeScolaire
  );
  
  if (existing) return existing.id;
  
  // Créer une nouvelle classe
  const newClasse = db.create('classes', {
    niveau,
    section,
    anneeScolaire,
    enseignantPrincipal: '',
    effectifMax: 40,
    salle: '',
    matieres: []
  }) as any;
  
  return newClasse.id;
}

// Fonction utilitaire pour nettoyer un numéro de téléphone
function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  // Garder seulement les chiffres et le +
  return String(phone).replace(/[^\d+]/g, '').trim();
}

// Fonction utilitaire pour détecter si un élève est protégé
function isEleveProtege(row: any[], statutIdx: number, totalPayeIdx: number, montantScolariteIdx: number): boolean {
  if (statutIdx < 0) return false;
  
  const statut = String(row[statutIdx] || '').toLowerCase().trim();
  
  // Si le statut contient "soldé" ou "solde"
  if (statut.includes('soldé') || statut.includes('solde')) {
    // Vérifier si le montant payé est faible (proche de l'inscription uniquement)
    if (totalPayeIdx >= 0 && montantScolariteIdx >= 0) {
      const totalPaye = Number(String(row[totalPayeIdx] || '0').replace(/[^0-9]/g, '')) || 0;
      const montantTotal = Number(String(row[montantScolariteIdx] || '0').replace(/[^0-9]/g, '')) || 0;
      
      // Si payé moins de 50% du total, probablement protégé
      if (totalPaye > 0 && montantTotal > 0 && totalPaye < montantTotal * 0.5) {
        return true;
      }
    }
  }
  
  return false;
}

// Interface pour le mapping des colonnes
export interface ColumnMapping {
  nomPrenomsCombined?: number;  // Index de la colonne "Nom & Prénoms" combinée
  nom?: number;                  // Index de la colonne "Nom" séparée
  prenoms?: number;              // Index de la colonne "Prénoms" séparée
  classe: number;                // Index de la colonne "Classe"
  contact?: number;              // Index de la colonne "Contact"
  protege?: number;              // Index de la colonne "Protégé ?"
  statut?: number;               // Index de la colonne "Statut"
  totalPaye?: number;            // Index de la colonne "Total Payé"
  montantDu?: number;            // Index de la colonne "Montant dû"
}

// Interface pour l'analyse de la structure du fichier
export interface ExcelAnalysis {
  headers: string[];
  detectedMapping: ColumnMapping;
  confidence: {
    nom: number;
    classe: number;
    overall: number;
  };
  preview: any[][];
  suggestions: {
    column: string;
    detectedIndex: number;
    detectedName: string;
    confidence: number;
  }[];
  sheets: string[];  // Liste des feuilles disponibles
  selectedSheet: string;  // Feuille actuellement sélectionnée
}

/**
 * Détecte intelligemment une colonne en utilisant plusieurs patterns
 * @param headers - Liste des en-têtes de colonnes
 * @param patterns - Patterns à rechercher (insensibles à la casse)
 * @returns Index de la colonne trouvée et score de confiance (0-100)
 */
function detectColumnSmart(headers: string[], patterns: string[]): { index: number; confidence: number; matchedHeader: string } {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim().replace(/\s+/g, ' '));
  
  // Recherche exacte (100% confiance)
  for (let i = 0; i < lowerHeaders.length; i++) {
    for (const pattern of patterns) {
      if (lowerHeaders[i] === pattern.toLowerCase()) {
        return { index: i, confidence: 100, matchedHeader: headers[i] };
      }
    }
  }
  
  // Recherche par inclusion (80% confiance)
  for (let i = 0; i < lowerHeaders.length; i++) {
    for (const pattern of patterns) {
      const patternLower = pattern.toLowerCase();
      if (lowerHeaders[i].includes(patternLower) || patternLower.includes(lowerHeaders[i])) {
        return { index: i, confidence: 80, matchedHeader: headers[i] };
      }
    }
  }
  
  // Recherche par mots-clés multiples (60% confiance)
  for (let i = 0; i < lowerHeaders.length; i++) {
    const headerWords = lowerHeaders[i].split(/[\s&]+/);
    for (const pattern of patterns) {
      const patternWords = pattern.toLowerCase().split(/[\s&]+/);
      const matchCount = patternWords.filter(pw => headerWords.some(hw => hw.includes(pw) || pw.includes(hw))).length;
      if (matchCount >= Math.ceil(patternWords.length * 0.6)) {
        return { index: i, confidence: 60, matchedHeader: headers[i] };
      }
    }
  }
  
  return { index: -1, confidence: 0, matchedHeader: '' };
}

/**
 * Analyse la structure d'un fichier Excel et propose un mapping des colonnes
 * @param file - Fichier Excel à analyser
 * @param sheetName - Nom de la feuille à analyser (optionnel, première feuille par défaut)
 * @returns Analyse complète avec mapping suggéré
 */
export async function analyzeExcelStructure(file: File, sheetName?: string): Promise<ExcelAnalysis> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer | string;
        const workbook = XLSX.read(data, { 
          type: typeof data === 'string' ? 'binary' : 'array',
          cellDates: true,
          cellNF: false,
          cellText: false
        });
        
        const sheets = workbook.SheetNames;
        console.log('📚 Feuilles disponibles:', sheets);
        
        const selectedSheetName = sheetName || workbook.SheetNames[0];
        console.log('📄 Feuille sélectionnée:', selectedSheetName);
        
        const sheet = workbook.Sheets[selectedSheetName];
        
        // Obtenir la plage de cellules
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        console.log('📐 Plage du fichier:', sheet['!ref'], 'Range:', range);
        
        // Lire TOUTES les cellules de la première ligne directement
        const headers: string[] = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
          const cell = sheet[cellAddress];
          if (cell && cell.v !== undefined && cell.v !== null) {
            headers.push(String(cell.v).trim());
          } else {
            headers.push(`Colonne ${col + 1}`);
          }
        }
        
        console.log('📋 En-têtes extraits (méthode directe):', headers);
        console.log('📋 Nombre total de colonnes:', headers.length);
        
        // Lire les données avec defval pour les cellules vides
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { 
          header: 1,
          defval: '',
          raw: false,
          range: range.s.r
        });

        if (!rows || rows.length === 0) {
          reject('Fichier Excel vide ou illisible');
          return;
        }

        console.log('📋 Première ligne via sheet_to_json:', rows[0]);
        console.log('📋 Comparaison - Direct:', headers.length, 'vs JSON:', rows[0]?.length);
        const preview = rows.slice(1, 6); // 5 premières lignes de données

        // Patterns de détection pour chaque type de colonne
        const nomPrenomsPatterns = [
          'nom & prénoms', 'nom & prenoms', 'nom et prénoms', 'nom et prenoms',
          'nom&prénoms', 'nom&prenoms', 'noms & prénoms', 'nom prenom',
          'nom prenoms', 'nom complet', 'full name', 'eleve', 'élève'
        ];
        
        const nomPatterns = ['nom', 'noms', 'name', 'lastname', 'surname'];
        const prenomsPatterns = ['prénom', 'prenom', 'prénoms', 'prenoms', 'firstname', 'given name'];
        const classePatterns = ['classe', 'class', 'niveau', 'grade'];
        const contactPatterns = ['contact', 'tel', 'téléphone', 'telephone', 'phone', 'portable', 'mobile'];
        const protegePatterns = ['protégé', 'protege', 'protégé ?', 'protege ?', 'protected'];
        const statutPatterns = ['statut', 'status', 'état', 'etat'];
        const totalPayePatterns = ['total payé', 'total paye', 'montant payé', 'montant paye', 'paid'];
        const montantDuPatterns = ['montant dû', 'montant du', 'montant à payer', 'scolarité', 'scolarite', 'amount due'];

        // Détection des colonnes
        const nomPrenomsCombined = detectColumnSmart(headers, nomPrenomsPatterns);
        const nom = detectColumnSmart(headers, nomPatterns);
        const prenoms = detectColumnSmart(headers, prenomsPatterns);
        const classe = detectColumnSmart(headers, classePatterns);
        const contact = detectColumnSmart(headers, contactPatterns);
        const protege = detectColumnSmart(headers, protegePatterns);
        const statut = detectColumnSmart(headers, statutPatterns);
        const totalPaye = detectColumnSmart(headers, totalPayePatterns);
        const montantDu = detectColumnSmart(headers, montantDuPatterns);

        // Construire le mapping détecté
        const detectedMapping: ColumnMapping = {
          classe: classe.index
        };

        // Prioriser la colonne combinée si elle existe et a une bonne confiance
        if (nomPrenomsCombined.index >= 0 && nomPrenomsCombined.confidence >= 60) {
          detectedMapping.nomPrenomsCombined = nomPrenomsCombined.index;
        } else if (nom.index >= 0 && prenoms.index >= 0) {
          // Sinon utiliser les colonnes séparées
          detectedMapping.nom = nom.index;
          detectedMapping.prenoms = prenoms.index;
        } else if (nom.index >= 0) {
          // Si seulement nom existe, l'utiliser comme combiné
          detectedMapping.nomPrenomsCombined = nom.index;
        }

        if (contact.index >= 0) detectedMapping.contact = contact.index;
        if (protege.index >= 0) detectedMapping.protege = protege.index;
        if (statut.index >= 0) detectedMapping.statut = statut.index;
        if (totalPaye.index >= 0) detectedMapping.totalPaye = totalPaye.index;
        if (montantDu.index >= 0) detectedMapping.montantDu = montantDu.index;

        // Calculer la confiance globale
        const nomConfidence = nomPrenomsCombined.confidence > 0 ? nomPrenomsCombined.confidence : 
                             (nom.confidence > 0 && prenoms.confidence > 0 ? Math.min(nom.confidence, prenoms.confidence) : 
                             nom.confidence);
        const overallConfidence = Math.round((nomConfidence + classe.confidence) / 2);

        // Construire les suggestions
        const suggestions = [
          { column: 'Nom & Prénoms (combiné)', detectedIndex: nomPrenomsCombined.index, detectedName: nomPrenomsCombined.matchedHeader, confidence: nomPrenomsCombined.confidence },
          { column: 'Nom (séparé)', detectedIndex: nom.index, detectedName: nom.matchedHeader, confidence: nom.confidence },
          { column: 'Prénoms (séparé)', detectedIndex: prenoms.index, detectedName: prenoms.matchedHeader, confidence: prenoms.confidence },
          { column: 'Classe', detectedIndex: classe.index, detectedName: classe.matchedHeader, confidence: classe.confidence },
          { column: 'Contact', detectedIndex: contact.index, detectedName: contact.matchedHeader, confidence: contact.confidence },
          { column: 'Protégé ?', detectedIndex: protege.index, detectedName: protege.matchedHeader, confidence: protege.confidence },
        ].filter(s => s.detectedIndex >= 0);

        resolve({
          headers,
          detectedMapping,
          confidence: {
            nom: nomConfidence,
            classe: classe.confidence,
            overall: overallConfidence
          },
          preview,
          suggestions,
          sheets,
          selectedSheet: selectedSheetName
        });
      } catch (err) {
        reject(err instanceof Error ? err.message : String(err));
      }
    };
    reader.onerror = () => reject('Erreur lecture du fichier');
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Importation complète: élèves + classes + paiements + contacts
 * Cette fonction gère l'importation intelligente depuis un fichier Excel contenant:
 * - Les informations des élèves (nom, classe)
 * - Les paiements mensuels
 * - Les contacts parents
 * - La détection automatique des élèves protégés
 * 
 * @param file - Fichier Excel à importer
 * @param columnMapping - Mapping manuel des colonnes (optionnel). Si non fourni, retourne l'analyse pour validation
 * @returns Résultats de l'importation ou analyse pour validation
 */
export async function importerElevesEtPaiementsComplet(file: File, columnMapping?: ColumnMapping) {
  return new Promise(async (resolve, reject) => {
    // Si pas de mapping fourni, analyser d'abord
    if (!columnMapping) {
      try {
        const analysis = await analyzeExcelStructure(file);
        console.log('📊 Analyse du fichier Excel:', analysis);
        
        // Si la confiance est faible, retourner l'analyse pour validation manuelle
        if (analysis.confidence.overall < 80) {
          resolve({
            needsValidation: true,
            analysis
          });
          return;
        }
        
        // Sinon utiliser le mapping détecté automatiquement
        columnMapping = analysis.detectedMapping;
        console.log('✅ Mapping automatique utilisé:', columnMapping);
      } catch (err) {
        reject(err instanceof Error ? err.message : String(err));
        return;
      }
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer | string;
        const workbook = XLSX.read(data, { type: typeof data === 'string' ? 'binary' : 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (!rows || rows.length === 0) {
          reject('Fichier Excel vide ou illisible');
          return;
        }

        const header = (rows[0] as any[]).map((h: any) => String(h || '').trim());
        const body = rows.slice(1) as any[][];

        // À ce point, columnMapping est garanti d'exister (soit fourni, soit détecté)
        if (!columnMapping) {
          reject('Mapping des colonnes non disponible');
          return;
        }

        // Extraire les indices des colonnes depuis le mapping
        const nameIdx = columnMapping.nomPrenomsCombined ?? -1;
        const nomIdx = columnMapping.nom ?? -1;
        const prenomsIdx = columnMapping.prenoms ?? -1;
        const classeIdx = columnMapping.classe;
        const contactIdx = columnMapping.contact ?? -1;
        const protegeIdx = columnMapping.protege ?? -1;
        const statutIdx = columnMapping.statut ?? -1;
        const totalPayeIdx = columnMapping.totalPaye ?? -1;
        const montantScolariteIdx = columnMapping.montantDu ?? -1;

        console.log('📋 Colonnes utilisées:', {
          nameIdx,
          nomIdx,
          prenomsIdx,
          classeIdx,
          contactIdx,
          protegeIdx,
          statutIdx,
          totalPayeIdx,
          montantScolariteIdx
        });

        // Détecter les colonnes de mois pour les paiements
        const monthNames = ['inscription','octobre','novembre','décembre','decembre','janvier','février','fevrier','mars','avril','mai','juin','juillet','août','aout','septembre'];
        const monthCols: { idx: number; name: string; modalite: number }[] = [];
        const lowerHeaders = header.map(h => h.toLowerCase().trim());
        const hasInscription = lowerHeaders.some(h => h.includes('inscription'));
        let nextModalite = hasInscription ? 2 : 1;
        
        header.forEach((h, i) => {
          const low = String(h || '').toLowerCase();
          if (monthNames.some(m => low.includes(m))) {
            if (low.includes('inscription')) {
              monthCols.push({ idx: i, name: String(h), modalite: 1 });
            } else {
              monthCols.push({ idx: i, name: String(h), modalite: nextModalite });
              nextModalite++;
            }
          }
        });

        console.log('📅 Colonnes de paiements détectées:', monthCols);

        // Validation des colonnes essentielles
        if (nameIdx < 0 && nomIdx < 0) {
          reject('Colonne "Nom" ou "Nom & Prénoms" non trouvée dans le fichier. Colonnes disponibles: ' + header.join(', '));
          return;
        }

        if (classeIdx < 0) {
          reject('Colonne "Classe" non trouvée dans le fichier. Colonnes disponibles: ' + header.join(', '));
          return;
        }

        // Obtenir l'année scolaire active
        const ecole = db.getAll('ecole')[0] as any;
        const anneeScolaire = ecole?.anneeScolaireActive || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

        const results = {
          elevesCreated: [] as Array<{ nom: string; prenoms: string; classe: string; matricule: string; protege: boolean }>,
          classesCreated: [] as Array<{ niveau: string; section: string }>,
          paiementsApplied: [] as Array<{ eleveName: string; totalAmount: number; details: string }>,
          errors: [] as Array<{ row: number; error: string; name?: string }>
        };

        // Traiter chaque ligne
        for (let r = 0; r < body.length; r++) {
          const row = body[r];
          
          try {
            // Extraire les informations de base
            let nom = '';
            let prenoms = '';
            let rawName = '';

            // Gérer les colonnes combinées ou séparées
            if (nameIdx >= 0) {
              // Colonne combinée "Nom & Prénoms"
              rawName = String(row[nameIdx] || '').trim();
              const nameParts = rawName.split(' ');
              nom = nameParts[0] || '';
              prenoms = nameParts.slice(1).join(' ') || '';
            } else if (nomIdx >= 0 && prenomsIdx >= 0) {
              // Colonnes séparées "Nom" et "Prénoms"
              nom = String(row[nomIdx] || '').trim();
              prenoms = String(row[prenomsIdx] || '').trim();
              rawName = `${nom} ${prenoms}`.trim();
            } else if (nomIdx >= 0) {
              // Seulement colonne "Nom"
              rawName = String(row[nomIdx] || '').trim();
              const nameParts = rawName.split(' ');
              nom = nameParts[0] || '';
              prenoms = nameParts.slice(1).join(' ') || '';
            }

            const rawClasse = String(row[classeIdx] || '').trim();
            const rawContact = contactIdx >= 0 ? String(row[contactIdx] || '').trim() : '';
            
            if (!nom || !rawClasse) {
              continue; // Ignorer les lignes vides
            }

            if (!nom) {
              results.errors.push({ row: r + 2, error: 'Nom invalide', name: rawName });
              continue;
            }

            console.log(`📝 Traitement ligne ${r + 2}: ${nom} ${prenoms} - ${rawClasse}`);

            // Parser la classe
            const { niveau, section } = parseClasseName(rawClasse);
            if (!niveau) {
              results.errors.push({ row: r + 2, error: 'Classe invalide', name: rawName });
              continue;
            }

            // Trouver ou créer la classe
            const classeId = findOrCreateClasse(niveau, section, anneeScolaire);
            
            // Vérifier si la classe vient d'être créée
            const wasClasseCreated = !db.getAll<any>('classes').some(c => 
              c.id === classeId && c.createdAt !== c.updatedAt
            );
            if (wasClasseCreated) {
              results.classesCreated.push({ niveau, section });
            }

            // Détecter si l'élève est protégé
            let protege = false;
            
            // D'abord vérifier la colonne "Protégé ?" si elle existe
            if (protegeIdx >= 0) {
              const protegeValue = String(row[protegeIdx] || '').toLowerCase().trim();
              protege = protegeValue === 'oui' || protegeValue === 'yes' || protegeValue === 'o';
            } else {
              // Sinon utiliser la détection automatique
              protege = isEleveProtege(row, statutIdx, totalPayeIdx, montantScolariteIdx);
            }

            // Nettoyer le contact
            const telephone = cleanPhoneNumber(rawContact);

            // Créer l'élève
            const eleve = db.create<Eleve>('eleves', {
              nom: nom.toUpperCase(),
              prenoms: prenoms,
              matricule: db.generateMatricule(),
              sexe: 'M', // Par défaut, peut être modifié manuellement après
              dateNaissance: '',
              lieuNaissance: '',
              classeId,
              anneeEntree: anneeScolaire.split('-')[0],
              statut: 'Actif',
              pereTuteur: '', // Sera rempli avec le contact
              mereTutrice: '',
              telephone: telephone, // Numéro du père par défaut
              adresse: '',
              photo: '',
              protege: protege
            } as Partial<Eleve>);

            results.elevesCreated.push({
              nom: eleve.nom,
              prenoms: eleve.prenoms,
              classe: `${niveau} ${section}`,
              matricule: eleve.matricule,
              protege: protege
            });

            // Traiter les paiements pour cet élève
            let totalPaiements = 0;
            const paiementDetails: string[] = [];

            for (const mc of monthCols) {
              const cell = row[mc.idx];
              if (!cell && cell !== 0) continue;
              
              // Parser le montant
              const cleaned = String(cell).replace(/[^0-9]/g, '');
              if (!cleaned) continue;
              const montant = Number(cleaned);
              if (!montant || isNaN(montant) || montant <= 0) continue;

              // Si élève protégé, ne traiter que l'inscription (modalité 1)
              if (protege && mc.modalite !== 1) {
                continue;
              }

              // Dériver une date du nom de la colonne
              const now = new Date();
              let dateStr = now.toISOString();
              const low = String(mc.name || '').toLowerCase();
              const monthMap: Record<string, number> = {
                'janvier': 1, 'fevrier': 2, 'février': 2, 'mars': 3, 'avril': 4,
                'mai': 5, 'juin': 6, 'juillet': 7, 'août': 8, 'aout': 8,
                'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12, 'decembre': 12
              };
              
              for (const key in monthMap) {
                if (low.includes(key)) {
                  const year = parseInt(anneeScolaire.split('-')[0]);
                  const m = monthMap[key];
                  // Ajuster l'année si le mois est après septembre
                  const adjustedYear = m >= 9 ? year : year + 1;
                  dateStr = new Date(adjustedYear, m - 1, 1).toISOString();
                  break;
                }
              }

              // Traiter le paiement avec allocation intelligente
              try {
                const meta: any = {
                  source: 'import',
                  note: `Import ${mc.name}`,
                  modalite: mc.modalite,
                  pereTelephone: telephone,
                  typeFrais: mc.modalite === 1 ? 'inscription' : 'scolarite',
                  modePaiement: 'Espèces',
                  numeroRecu: `IMP-${eleve.matricule}-${mc.modalite}`,
                  operateur: 'Système'
                };

                payments.processPayment(eleve.id, montant, dateStr, meta);
                totalPaiements += montant;
                paiementDetails.push(`${mc.name}: ${montant} FCFA`);
              } catch (err) {
                results.errors.push({
                  row: r + 2,
                  error: `Erreur paiement ${mc.name}: ${err instanceof Error ? err.message : String(err)}`,
                  name: rawName
                });
              }
            }

            if (totalPaiements > 0) {
              results.paiementsApplied.push({
                eleveName: `${eleve.nom} ${eleve.prenoms}`,
                totalAmount: totalPaiements,
                details: paiementDetails.join(', ')
              });
            }

          } catch (err) {
            results.errors.push({
              row: r + 2,
              error: err instanceof Error ? err.message : String(err),
              name: row[nameIdx] ? String(row[nameIdx]) : 'Inconnu'
            });
          }
        }

        resolve(results);
      } catch (err) {
        reject(err instanceof Error ? err.message : String(err));
      }
    };
    reader.onerror = () => reject('Erreur lecture du fichier');
    reader.readAsArrayBuffer(file);
  });
}
