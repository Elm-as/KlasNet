import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Plus, Download, Upload, Edit2, Eye, Trash2, Filter, Printer } from 'lucide-react';
import Button from '../UI/Button';
import { db } from '../../utils/database';
import { formatNomPrenoms } from '../../utils/formatName';
import { useToast } from '../Layout/ToastProvider';
import { Eleve, Classe, Enseignant, Paiement } from '../../types';
import EnteteFiche from '../EnteteFiche';
import { getEnteteConfig } from '../../utils/entetesConfig';
import { financialCache } from '../../utils/financialCache';
import ModuleContainer from '../Layout/ModuleContainer';

interface ElevesListProps {
  onEleveSelect: (eleve: Eleve | null) => void;
  onNewEleve: () => void;
}

export default function ElevesList({ onEleveSelect, onNewEleve }: ElevesListProps) {
  const { showToast } = useToast();
  
  // Sélection multiple (doit être dans le composant !)
  const [selectedEleves, setSelectedEleves] = useState<string[]>([]);
  const [showChangeClasse, setShowChangeClasse] = useState(false);
  const [newClasseId, setNewClasseId] = useState('');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEleves(filteredEleves.map((e: any) => e.id));
    } else {
      setSelectedEleves([]);
    }
  };
  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedEleves(prev => checked ? [...prev, id] : prev.filter(eid => eid !== id));
  };
  const handleDeleteSelected = () => {
    if (selectedEleves.length === 0) return;
    if (!window.confirm(`Supprimer ${selectedEleves.length} élève(s) ?`)) return;
    selectedEleves.forEach(id => db.delete('eleves', id));
  setTimeout(() => { /* dataChanged dispatched by db.create/update/delete */ }, 100);
  };
  const handleChangeClasse = () => {
    if (!newClasseId) return;
    selectedEleves.forEach(id => db.update('eleves', id, { classeId: newClasseId } as any));
    setShowChangeClasse(false);
    setSelectedEleves([]);
  setTimeout(() => { /* dataChanged dispatched by db.create/update/delete */ }, 100);
  };
  // Aperçu et mapping import
  const [importFile, setImportFile] = useState<File|null>(null);
  const [importColumns, setImportColumns] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importMapping, setImportMapping] = useState({ matricule: '', nom: '', prenoms: '', nomPrenoms: '' });
  const [importClasseId, setImportClasseId] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const paymentsFileRef = useRef<HTMLInputElement | null>(null);
  const [paymentImportReport, setPaymentImportReport] = useState<{ applied: any[]; unresolved: any[] } | null>(null);
  const [showPaymentReportModal, setShowPaymentReportModal] = useState(false);
  const [paymentPreview, setPaymentPreview] = useState<{ proposals: any[]; unresolved: any[] } | null>(null);
  const [showPaymentPreviewModal, setShowPaymentPreviewModal] = useState(false);

  

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log('handleImportExcel: file selected', file?.name, file?.size);
    setImportFile(file);
    
    // Si le fichier est .xls (BIFF) : SheetJS peut souvent le lire, mais certains fichiers très anciens ou corrompus
    // peuvent poser problème — demander confirmation avant de continuer.

    try {
      const mod = await import('../../utils/excelImportExport');
      const importer = mod.importerElevesDepuisExcel;
      console.log('handleImportExcel: importer function loaded', !!importer);
      if (typeof importer !== 'function') throw new Error('Module d\'import introuvable');
      const res: any = await importer(file);
      console.log('handleImportExcel: importer result', res && (Array.isArray(res) ? res.length : Object.keys(res).length));
      if (!res) throw new Error('Aucune donnée retournée par l\'importeur');
      if (Array.isArray(res)) {
        // importeur a retourné directement la liste d'élèves
        setImportPreview(res);
        setShowImportModal(true);
      } else if (res.columns) {
        setImportColumns(res.columns);
        setImportPreview(res.preview || []);
        setShowMappingModal(true);
      } else {
        setImportPreview(res.preview || []);
        setShowImportModal(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('Erreur lors de l\'importation: ' + msg, 'error');
      console.error('Import error:', err);
    }
  };

  const handleValidateMapping = async () => {
    if (!importFile) return;
    setShowMappingModal(false);
    const { importerElevesDepuisExcel } = await import('../../utils/excelImportExport');
    const res: any = await importerElevesDepuisExcel(importFile, importMapping);
    setImportPreview(res);
    setShowImportModal(true);
  };

  const handleValidateImport = async () => {
    if (!importClasseId) {
      alert("Sélectionnez une classe pour l'importation.");
      return;
    }
    const { db } = await import('../../utils/database');
    importPreview.forEach(eleve => {
      // Si l'importeur n'a pas fourni d'id, générer un matricule/id en base
      const existing = db.getAll('eleves').find((ex: any) => (
        (ex.matricule && ex.matricule === (eleve.matricule || '')) ||
        (ex.nom === (eleve.nom || '') && ex.prenoms === (eleve.prenoms || ''))
      ));
      if (existing) {
        // Mettre à jour la classe si nécessaire
        db.update('eleves', (existing as any).id, { classeId: importClasseId } as any);
      } else {
        const newId = db.generateMatricule();
        db.create('eleves', {
          ...eleve,
          id: newId,
          classeId: importClasseId,
          anneeEntree: new Date().getFullYear().toString(),
          statut: 'Actif',
          pereTuteur: eleve.pereTuteur || '',
          mereTutrice: eleve.mereTutrice || '',
          telephone: eleve.telephone || '',
          adresse: eleve.adresse || '',
          photo: eleve.photo || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });
    setShowImportModal(false);
    setImportPreview([]);
    setImportClasseId('');
    setImportFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  // dataChanged dispatched by db methods
  };
  // Import/Export Excel
  // (Supprimé la version simple, on garde la version avec aperçu et sélection de classe)
  const handleExportExcel = async () => {
  const { exporterElevesEnExcel } = await import('../../utils/excelImportExport');
  const data = await exporterElevesEnExcel(eleves);
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eleves_klasnet_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  // Calcul du statut financier avec cache
  const getStatutFinancier = useMemo(() => {
    const paiements = db.getAll<Paiement>('paiements');
    const paiementsCount = paiements.length;

    return (eleve: Eleve): 'Payé' | 'Partiel' | 'Impayé' | 'Non défini' => {
      try {
        const situation = financialCache.getSituationEcheances(eleve.id, paiementsCount);
        if (!situation) return 'Non défini';

        // If protege -> consider only inscription (modalite === 1)
        if (situation.eleve && situation.eleve.protege) {
          const ins = (situation.echeances || []).filter((e: any) => e.modalite === 1);
          const totalDuIns = ins.reduce((sum: number, e: any) => sum + (e.montant || 0), 0);
          const totalPayeIns = ins.reduce((sum: number, e: any) => sum + (e.montantPaye || 0), 0);
          if (totalDuIns > 0 && totalPayeIns >= totalDuIns) return 'Payé';
          if (totalPayeIns > 0 && totalPayeIns < totalDuIns) return 'Partiel';
          return 'Impayé';
        }

        const totalDu = situation.totalDu || 0;
        const totalPaye = situation.totalPaye || 0;
        if (totalDu === 0) return 'Non défini';
        if (totalPaye >= totalDu) return 'Payé';
        if (totalPaye > 0 && totalPaye < totalDu) return 'Partiel';
        return 'Impayé';
      } catch (err) {
        console.warn('Unable to compute financial status for', eleve.id, err);
        return 'Non défini';
      }
    };
  }, []);  // Ne recalculer que si la liste de paiements change

  function getStatutFinancierColor(statut: string) {
    switch (statut) {
      case 'Payé': return 'bg-green-100 text-green-800';
      case 'Partiel': return 'bg-orange-100 text-orange-800';
      case 'Impayé': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClasse, setFilterClasse] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [sortField, setSortField] = useState<keyof Eleve>('nom');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // reloadKey toggles when external data changes so hooks recompute (we only need the setter)
  const [, setReloadKey] = useState(0);

  useEffect(() => {
    const onDataChanged = () => {
      financialCache.invalidateAll();
      setReloadKey(k => k + 1);
    };
    window.addEventListener('dataChanged', onDataChanged as EventListener);
    return () => window.removeEventListener('dataChanged', onDataChanged as EventListener);
  }, []);

  const eleves = db.getAll<Eleve>('eleves');
  const classes = db.getAll<Classe>('classes');
  const enteteConfig = getEnteteConfig('eleves');

  // Build printable class label and school year
  const selectedClasseObj = classes.find(c => c.id === filterClasse);
  const printClasseLabel = selectedClasseObj ? `${selectedClasseObj.niveau} ${selectedClasseObj.section || ''}`.trim() : 'Toutes les classes';
  const printAnnee = selectedClasseObj ? selectedClasseObj.anneeScolaire : (classes[0]?.anneeScolaire || '');
  const printLibelle = `${printClasseLabel}${printAnnee ? ' — ' + printAnnee : ''} — ${enteteConfig.header}`;
  const includeClasseColumnInPrint = !selectedClasseObj; // preserved for other logic if needed

  // Determine which columns to print depending on whether we print all classes or a single class
  const printColumns = (() => {
    if (!selectedClasseObj) {
      // When printing all classes, keep the list compact for readability but include Classe
      return ['N°', 'Matricule', 'Nom & Prénom', 'Date de naissance', 'Classe'];
    }
    // For a single class, build columns in canonical order:
    // N°, Matricule (if present), Nom & Prénom, then other configured columns (exclude Classe and Date de naissance)
    const cfg = Array.isArray(enteteConfig.columns) ? [...enteteConfig.columns] : [];
    // filter out Classe and Date de naissance from cfg for single-class print
    const cfgFiltered = cfg.filter(c => !/classe/i.test(String(c)) && !/date\s*de\s*naiss/i.test(String(c)) && !/date.*naiss/i.test(String(c)));
    const hasMatricule = cfgFiltered.some(c => /matricul/i.test(String(c)));
    // remove any possible Nom & Prénom duplicates from cfgFiltered
  const extras = cfgFiltered.filter(c => (!(/nom/.test(String(c).toLowerCase()) && /pr/i.test(String(c).toLowerCase()))) && !/matricul/i.test(String(c)));
    // Build canonical cols with N°
    const cols: string[] = ['N°'];
    if (hasMatricule) cols.push('Matricule');
    cols.push('Nom & Prénom');
    cols.push(...extras);
    // Remove duplicates while preserving order
    return cols.filter((v, i, a) => a.indexOf(v) === i);
  })();

  // Compute column widths so the printed table cuts cleanly on pages
  const colWidths = (() => {
    const n = printColumns.length;
    if (n === 0) return [] as string[];
    // Preferred fixed widths
    // Case: printing ALL classes -> use N° (narrow), Matricule (narrow), Nom (large), Date, Classe
    if (!selectedClasseObj) {
      // Expecting ['N°','Matricule','Nom & Prénom','Date de naissance','Classe']
      if (n === 5) return ['5%', '10%', '50%', '14%', '21%'];
      // fallback: give name a larger share when possible
      if (n > 1) {
        const nameIndex = printColumns.findIndex(c => /nom/i.test(String(c)) && /pr/i.test(String(c)));
        if (nameIndex >= 0) {
          const remaining = 100 - 19; // reserve 19% for N° + matricule-like
          const each = Math.floor(remaining / (n - 2));
          return [ '5%', '14%', ...Array(n - 2).fill(`${each}%`) ];
        }
      }
      const eachFallback = Math.floor(100 / n);
      return Array(n).fill(`${eachFallback}%`);
    }

    // Case: single class printing. With N° column — ensure N°, Matricule and Nom & Prénoms get priority widths
    const hasMatricule = printColumns.some(c => /matricul/i.test(String(c)));
    const hasNomPrenom = printColumns.some(c => /nom/i.test(String(c)) && /pr/i.test(String(c)));
    if (selectedClasseObj) {
      // Prefer narrow N°, matricule and wide name column
      const n = printColumns.length;
      if (n === 1) return ['100%'];
      if (n === 2) {
        // N° + Nom — reduce name width
        if (hasNomPrenom) return ['10%', '90%'];
        return ['25%', '75%'];
      }
      if (n === 3) {
        // N°, Matricule, Nom — reduce Nom to 80%
        if (hasMatricule && hasNomPrenom) return ['5%', '15%', '80%'];
        return ['20%', '45%', '35%'];
      }
      if (n === 4) {
        // N°, Matricule, Nom, extra — reduce Nom to 45%
        if (hasMatricule && hasNomPrenom) return ['5%', '12%', '45%', '38%'];
        return ['20%', '45%', '35%']; // adjust if needed
      }
      // n > 4: allocate N° 5%, name a moderate share (45%), matricule small, rest split
      const matriculeWidth = hasMatricule ? 12 : 0;
      const nomWidth = hasNomPrenom ? 45 : 60;
      const noWidth = 5;
      const restCount = n - (hasMatricule && hasNomPrenom ? 3 : 2);
      const restWidth = restCount > 0 ? Math.max(4, Math.floor((100 - noWidth - matriculeWidth - nomWidth) / restCount)) : 0;
      const widths: string[] = [];
      if (hasMatricule) widths.push(`${matriculeWidth}%`);
      if (hasNomPrenom) widths.push(`${nomWidth}%`);
      for (let i = 0; i < restCount; i++) widths.push(`${restWidth}%`);
      // Align widths to printColumns order: N° first, then Matricule, then Nom, then extras
      // Build map
      const map: Record<string, string> = {};
      map['n°'] = `${noWidth}%`;
      let wi = 0;
      if (hasMatricule) { map['matricule'] = widths[wi++]; }
      if (hasNomPrenom) { map['nom & prénom'] = widths[wi++]; map['nom & prénoms'] = map['nom & prénom']; }
      // assign remaining widths to other columns in sequence
      const result = printColumns.map(p => map[String(p).toLowerCase()] || `${restWidth}%`);
      return result;
    }

    // Common fallback: equal widths
    const each = Math.floor(100 / n);
    return Array(n).fill(`${each}%`);
  })();

  const filteredEleves = useMemo(() => {
    let filtered = [...eleves];

    // Recherche textuelle
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(eleve =>
        eleve.nom.toLowerCase().includes(term) ||
        eleve.prenoms.toLowerCase().includes(term) ||
        eleve.matricule.toLowerCase().includes(term) ||
        eleve.pereTuteur.toLowerCase().includes(term) ||
        eleve.mereTutrice.toLowerCase().includes(term)
      );
    }

    // Filtrage par classe
    if (filterClasse) {
      filtered = filtered.filter(eleve => eleve.classeId === filterClasse);
    }

    // Filtrage par statut financier
    if (filterStatut) {
      filtered = filtered.filter(eleve => getStatutFinancier(eleve) === filterStatut);
    }

    // Tri
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Provide fallback for undefined values
      if (typeof aValue === 'undefined' || aValue === null) aValue = '';
      if (typeof bValue === 'undefined' || bValue === null) bValue = '';

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [eleves, searchTerm, filterClasse, filterStatut, sortField, sortDirection]);

  const handleSort = (field: keyof Eleve) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = (eleve: Eleve) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'élève ${eleve.prenoms} ${eleve.nom} ?`)) {
      db.delete('eleves', eleve.id);
      db.addHistorique({
        type: 'suppression',
        cible: 'Élève',
        cibleId: eleve.id,
        description: `Suppression de l'élève ${eleve.prenoms} ${eleve.nom}`,
        utilisateur: 'ADMIN',
      });
  setTimeout(() => { /* dataChanged dispatched by db.create/update/delete */ }, 100);
    }
  };

  const getClasseNom = (classeId: string) => {
    const classe = classes.find(c => c.id === classeId);
    return classe ? `${classe.niveau} ${classe.section}` : 'Non assigné';
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'Actif': return 'bg-green-100 text-green-800';
      case 'Inactif': return 'bg-gray-100 text-gray-800';
      case 'Transféré': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <ModuleContainer
      title="Gestion des Élèves"
      subtitle={`${filteredEleves.length} élève(s) trouvé(s)`}
      actions={(
        <>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportExcel} />
          <Button variant="secondary" className="px-3" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            <span>Importer</span>
          </Button>

          <Button variant="secondary" className="px-3" onClick={handleExportExcel}>
            <Download className="h-4 w-4" />
            <span>Exporter</span>
          </Button>

          <input ref={paymentsFileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const mod = await import('../../utils/excelImportExport');
              if (typeof mod.previewImporterPaiementsDepuisExcel !== 'function') throw new Error('Importeur de paiements introuvable');
              const preview = await mod.previewImporterPaiementsDepuisExcel(f);
              setPaymentPreview(preview as any);
              setShowPaymentPreviewModal(true);
            } catch (err) {
              const m = err instanceof Error ? err.message : String(err);
              showToast('Erreur import paiements: ' + m, 'error');
              console.error(err);
            }
          }} />

          <Button variant="secondary" className="px-3" onClick={() => paymentsFileRef.current?.click()}>
            <Upload className="h-4 w-4" />
            <span>Importer paiements</span>
          </Button>

          <Button variant="primary" onClick={onNewEleve}>
            <Plus className="h-4 w-4" />
            <span>Nouvel Élève</span>
          </Button>

          <Button variant="secondary" onClick={() => window.print()} className="px-3">
            <Printer className="h-4 w-4" />
            <span>Imprimer / PDF</span>
          </Button>

          {/* Modal mapping des colonnes */}
          {showMappingModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 relative animate-fade-in flex flex-col items-center">
                <h2 className="text-xl font-bold mb-4">Sélectionnez les colonnes à importer</h2>
                <div className="space-y-3 w-full">
                  <div>
                    <label>Matricule :</label>
                    <select value={importMapping.matricule} onChange={e => setImportMapping({ ...importMapping, matricule: e.target.value })} className="w-full border rounded px-2 py-1">
                      <option value="">-- Choisir --</option>
                      {importColumns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Nom :</label>
                    <select value={importMapping.nom} onChange={e => setImportMapping({ ...importMapping, nom: e.target.value })} className="w-full border rounded px-2 py-1">
                      <option value="">-- Choisir --</option>
                      {importColumns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Prénoms :</label>
                    <select value={importMapping.prenoms} onChange={e => setImportMapping({ ...importMapping, prenoms: e.target.value })} className="w-full border rounded px-2 py-1">
                      <option value="">-- Choisir --</option>
                      {importColumns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Noms et Prénoms (si tout est dans une seule colonne) :</label>
                    <select value={importMapping.nomPrenoms} onChange={e => setImportMapping({ ...importMapping, nomPrenoms: e.target.value })} className="w-full border rounded px-2 py-1">
                      <option value="">-- Choisir --</option>
                      {importColumns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                    <div className="text-xs text-gray-500">Si cette colonne est sélectionnée, le nom sera le premier mot, le reste les prénoms.</div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end space-x-2 w-full">
                  <button className="px-4 py-2 bg-gray-200 rounded" onClick={()=>setShowMappingModal(false)}>Annuler</button>
                  <button className="px-4 py-2 bg-teal-600 text-white rounded" onClick={handleValidateMapping}>Valider</button>
                </div>
                <div className="mt-4 w-full">
                  <h3 className="font-semibold mb-2">Aperçu des données :</h3>
                  <table className="w-full text-xs border">
                    <thead>
                      <tr>
                        {importColumns.map(col => <th key={col} className="border px-1">{col}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((row, i) => (
                        <tr key={i}>
                          {importColumns.map((_, j) => <td key={j} className="border px-1">{row[j]}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Modal aperçu importation après mapping */}
          {showImportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-[90vw] p-8 relative animate-fade-in flex flex-col items-center">
                <h2 className="text-2xl font-bold mb-6 text-center">Aperçu de l'importation</h2>
                <div className="w-full max-h-[60vh] overflow-y-auto mb-6 border rounded-lg">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr className="text-center">
                        <th className="py-2 px-3 border">Matricule</th>
                        <th className="py-2 px-3 border">Nom</th>
                        <th className="py-2 px-3 border">Prénoms</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((e, idx) => (
                        <tr key={idx} className="text-center hover:bg-gray-50">
                          <td className="py-2 px-3 border">{e.matricule}</td>
                          <td className="py-2 px-3 border">{e.nom}</td>
                          <td className="py-2 px-3 border">{e.prenoms}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mb-6 w-full flex flex-col items-center">
                  <label className="font-semibold mb-2">Classe d'affectation :</label>
                  <select
                    value={importClasseId}
                    onChange={e => setImportClasseId(e.target.value)}
                    className="px-3 py-2 border rounded w-full max-w-xs"
                  >
                    <option value="">Sélectionner une classe</option>
                    {classes.map(classe => (
                      <option key={classe.id} value={classe.id}>{classe.niveau} {classe.section}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-4 w-full">
                  <button className="px-4 py-2 bg-gray-400 text-white rounded" onClick={() => setShowImportModal(false)}>Annuler</button>
                  <button className="px-4 py-2 bg-teal-600 text-white rounded font-bold" onClick={handleValidateImport}>Valider l'importation</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal rapport import paiements */}
          {showPaymentReportModal && paymentImportReport && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-[90vw] p-6 relative animate-fade-in">
                <h2 className="text-2xl font-bold mb-4">Résultat de l'import des paiements</h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="border rounded p-3">
                    <h3 className="font-semibold">Paiements appliqués ({paymentImportReport.applied.length})</h3>
                    <div className="mt-2 max-h-60 overflow-auto text-sm">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr><th className="py-1">Ligne</th><th className="py-1">Élève</th><th className="py-1">Mois</th><th className="py-1">Montant</th></tr>
                        </thead>
                        <tbody>
                          {paymentImportReport.applied.map((a, i) => (
                            <tr key={i} className="border-t"><td className="py-1">{a.row}</td><td className="py-1">{a.eleveId}</td><td className="py-1">{a.month}</td><td className="py-1">{a.montant}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="border rounded p-3">
                    <h3 className="font-semibold">Lignes non résolues ({paymentImportReport.unresolved.length})</h3>
                    <div className="mt-2 max-h-60 overflow-auto text-sm">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr><th className="py-1">Ligne</th><th className="py-1">Nom</th><th className="py-1">Classe</th><th className="py-1">Contact</th></tr>
                        </thead>
                        <tbody>
                          {paymentImportReport.unresolved.map((u, i) => (
                            <tr key={i} className="border-t"><td className="py-1">{u.row}</td><td className="py-1">{u.name}</td><td className="py-1">{u.classe}</td><td className="py-1">{u.contact || ''}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => { setShowPaymentReportModal(false); setPaymentImportReport(null); }}>Fermer</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal preview import paiements -> allow apply */}
          {showPaymentPreviewModal && paymentPreview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-[95vw] p-6 relative animate-fade-in">
                <h2 className="text-2xl font-bold mb-4">Aperçu des paiements détectés</h2>
                <div className="max-h-[55vh] overflow-auto mb-4">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="p-2 border">Ligne</th>
                        <th className="p-2 border">Élève suggéré</th>
                        <th className="p-2 border">Nom</th>
                        <th className="p-2 border">Classe</th>
                        <th className="p-2 border">Mois</th>
                        <th className="p-2 border">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentPreview.proposals.map((p, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{p.row}</td>
                          <td className="p-2">{p.match ? p.match.name : '—'}</td>
                          <td className="p-2">{p.name}</td>
                          <td className="p-2">{p.classe}</td>
                          <td className="p-2">{p.month}</td>
                          <td className="p-2">{p.montant}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4">
                    <h3 className="font-semibold">Lignes non résolues ({paymentPreview.unresolved.length})</h3>
                    <div className="max-h-40 overflow-auto">
                      <table className="w-full text-sm">
                        <thead><tr><th className="p-2 border">Ligne</th><th className="p-2 border">Nom</th><th className="p-2 border">Classe</th></tr></thead>
                        <tbody>
                          {paymentPreview.unresolved.map((u, i) => <tr key={i} className="border-t"><td className="p-2">{u.row}</td><td className="p-2">{u.name}</td><td className="p-2">{u.classe}</td></tr>)}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => { setShowPaymentPreviewModal(false); setPaymentPreview(null); }}>Annuler</button>
                  <button className="px-4 py-2 bg-teal-600 text-white rounded" onClick={async () => {
                    // apply proposals
                    try {
                      const mod = await import('../../utils/excelImportExport');
                      const res = await mod.applyPaiementsDepuisProposals(paymentPreview.proposals);
                      setPaymentImportReport(res as any);
                      setShowPaymentReportModal(true);
                      setShowPaymentPreviewModal(false);
                      setPaymentPreview(null);
                      // dataChanged dispatched by db methods
                    } catch (err) {
                      const m = err instanceof Error ? err.message : String(err);
                      showToast('Erreur lors de l\'application: ' + m, 'error');
                    }
                  }}>Appliquer les paiements</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    >

  {/* Filtres et recherche */}
      <div className="bg-white p-4 rounded-md border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un élève..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            />
          </div>
          
          <select
            value={filterClasse}
            onChange={(e) => setFilterClasse(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
          >
            <option value="">Toutes les classes</option>
            {classes.map(classe => (
              <option key={classe.id} value={classe.id}>
                {classe.niveau} {classe.section}
              </option>
            ))}
          </select>

          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
          >
            <option value="">Tous les statuts financiers</option>
            <option value="Payé">Payé</option>
            <option value="Partiel">Partiel</option>
            <option value="Impayé">Impayé</option>
          </select>

          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            <Filter className="h-4 w-4" />
            <span>Plus de filtres</span>
          </button>
        </div>
      </div>

      {/* Table des élèves + actions groupées */}
      <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
  {/* SECTION D'IMPRESSION (visible seulement lors du print) */}
  <div id="print-area" className="hidden print:block bg-white p-4 mb-4">
          <EnteteFiche type="eleves" libelle={printLibelle} />
          {/* Header hors-table pour impression : table avec colgroup pour aligner les colonnes */}
          <div className="mb-2 overflow-x-auto">
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                {printColumns.map((c, idx) => (
                  <col key={idx} style={{ width: colWidths[idx] }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {printColumns.map((colLabel, idx) => (
                    <th key={idx} className="border px-2 py-1 text-left text-sm font-medium align-top">{colLabel}</th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                {printColumns.map((c, idx) => (
                  <col key={idx} style={{ width: colWidths[idx] }} />
                ))}
              </colgroup>
              <tbody>
                {filteredEleves.map((el, i) => (
                  <tr key={el.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {printColumns.map((colLabel, ci) => {
                      // mapping simple des libellés usuels vers les données
                      const label = colLabel.toLowerCase();
                      let content: any = '';

      // If printing a single class, force deterministic rendering for core columns
      if (selectedClasseObj) {
        if (label === 'n°') {
          content = i + 1; // always show index
          return <td key={ci} className="border px-2 py-1 text-sm align-top">{content}</td>;
        }
                        if (label.includes('matricul')) {
                          content = el.matricule || '';
                          return <td key={ci} className="border px-2 py-1 text-sm align-top">{content}</td>;
                        }
                        if (label.includes('nom') && label.includes('pr')) {
                          content = formatNomPrenoms(el);
                          return <td key={ci} className="border px-2 py-1 text-sm align-top">{content}</td>;
                        }
                        // For single-class, do not display Date de naissance or Classe unless explicitly desired
                        if (label.includes('date') && label.includes('naiss')) {
                          content = '';
                          return <td key={ci} className="border px-2 py-1 text-sm align-top">{content}</td>;
                        }
                      }
                      // For all-classes print, handle N° column explicitly here
                      if (!selectedClasseObj && label === 'n°') {
                        content = i + 1;
                        return <td key={ci} className="border px-2 py-1 text-sm align-top">{content}</td>;
                      }

                      // Prioriser les champs textuels explicites (éviter les sous-chaînes trop génériques)
                      if (label.includes('matricul')) {
                        content = el.matricule || '';
                      } else if (label.includes('nom') && label.includes('pr')) {
                        // "Nom & Prénom" ou "Nom et Prénoms"
                        content = formatNomPrenoms(el);
                      } else if (label.includes('nom') && !label.includes('pr')) {
                        content = el.nom || '';
                      } else if ((label.includes('pr') || label.includes('prénom') || label.includes('prenoms')) && !label.includes('nom')) {
                        content = el.prenoms || '';
                      } else if (label.includes('date') && label.includes('naiss')) {
                        content = el.dateNaissance ? new Date(el.dateNaissance).toLocaleDateString('fr-FR') : '';
                      } else if (label.includes('classe')) {
                        content = getClasseNom(el.classeId);
                      } else if (label.includes('sexe')) {
                        content = el.sexe === 'M' ? 'Masculin' : 'Féminin';
                      } else if (label.includes('parent')) {
                        content = `P: ${el.pereTuteur || ''} • M: ${el.mereTutrice || ''}`;
                      } else if (label.includes('statut financi') || label.includes('financier')) {
                        content = getStatutFinancier(el);
                      } else {
                        // détection stricte pour la colonne 'N°' (numéro)
                        const numberRegex = /\b(?:n°|no\.?|#|num(?:ero|éro)?|numero)\b/;
                        if (numberRegex.test(label)) {
                          content = i + 1;
                        } else {
                          // fallback: try to read a matching key (nettoyé)
                          const cleaned = colLabel.toLowerCase().replace(/\s+/g, '').replace(/&/g, 'and');
                          const key = Object.keys(el).find(k => k.toLowerCase() === cleaned) as keyof Eleve | undefined;
                          content = key ? (el as any)[key] : '';
                        }
                      }
                      return <td key={ci} className="border px-2 py-1 text-sm align-top">{content}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-xs text-right text-gray-500 mt-2">{enteteConfig.footer}</div>
          </div>
        </div>
  {/* Barre d'actions groupées */}
        {selectedEleves.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="font-medium text-gray-700">{selectedEleves.length} sélectionné(s)</span>
            <Button variant="danger" onClick={handleDeleteSelected}>Supprimer</Button>
            <Button variant="primary" onClick={()=>setShowChangeClasse(true)}>Changer de classe</Button>
            <Button variant="ghost" onClick={()=>setSelectedEleves([])}>Tout désélectionner</Button>
          </div>
        )}
        {/* Modal changement de classe */}
        {showChangeClasse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-[90vw] mx-4">
              <div className="border-b border-gray-200 pb-4 mb-6">
                <h2 className="text-xl font-bold text-gray-900 text-center">Changement de Classe</h2>
                <p className="text-gray-600 text-center mt-1">
                  {selectedEleves.length} élève(s) sélectionné(s)
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Nouvelle classe d'affectation
                  </label>
                  <select 
                    value={newClasseId} 
                    onChange={e => setNewClasseId(e.target.value)} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                  >
                    <option value="">Sélectionner une classe</option>
                    {classes.map(classe => (
                      <option key={classe.id} value={classe.id}>
                        {classe.niveau} {classe.section} ({classe.anneeScolaire})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                  <p className="text-gray-700 text-sm">
                    ⚠️ Cette action modifiera la classe de tous les élèves sélectionnés
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 mt-6 pt-6 border-t border-gray-200">
                <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setShowChangeClasse(false)}>Annuler</Button>
                <Button variant="primary" className="w-full sm:w-auto" onClick={handleChangeClasse} disabled={!newClasseId}>Valider le Changement</Button>
              </div>
              <>
              <h2 className="text-xl font-bold mb-4">Changer la classe de {selectedEleves.length} élève(s)</h2>
              <select value={newClasseId} onChange={e=>setNewClasseId(e.target.value)} className="w-full mb-4 border rounded px-3 py-2">
                <option value="">Sélectionner une classe</option>
                {classes.map(classe => (
                  <option key={classe.id} value={classe.id}>{classe.niveau} {classe.section}</option>
                ))}
              </select>
              <div className="flex justify-end space-x-2 w-full">
                <Button variant="secondary" onClick={()=>setShowChangeClasse(false)}>Annuler</Button>
                <Button variant="primary" onClick={handleChangeClasse}>Valider</Button>
              </div>
              </>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-2 py-3 text-center">
                  <input type="checkbox" checked={selectedEleves.length === filteredEleves.length && filteredEleves.length > 0} onChange={e=>handleSelectAll(e.target.checked)} />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">N°</th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('matricule')}
                >
                  Matricule {sortField === 'matricule' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('nom')}
                >
                  Nom et Prénoms {sortField === 'nom' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Sexe</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date Naissance</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Classe</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Parents</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Statut</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Statut Financier</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEleves.map((eleve, idx) => (
                <tr key={eleve.id} className={`hover:bg-gray-50 ${selectedEleves.includes(eleve.id) ? 'bg-teal-50' : ''}`}>
                  <td className="px-2 py-3 text-center">
                    <input type="checkbox" checked={selectedEleves.includes(eleve.id)} onChange={e=>handleSelectOne(eleve.id, e.target.checked)} />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {eleve.matricule}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      {eleve.photo && (
                        <img 
                          src={eleve.photo} 
                          alt={formatNomPrenoms(eleve)}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatNomPrenoms(eleve)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      eleve.sexe === 'M' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                    }`}>
                      {eleve.sexe === 'M' ? 'Masculin' : 'Féminin'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(eleve.dateNaissance).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {getClasseNom(eleve.classeId)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div>
                      <div className="font-medium">P: {eleve.pereTuteur}</div>
                      <div>M: {eleve.mereTutrice}</div>
                      {eleve.protege && eleve.garantId && (() => {
                          const garant = db.getById<Enseignant>('enseignants', eleve.garantId);
                          return garant ? <div className="text-xs text-gray-600 mt-1">Garant: {formatNomPrenoms(garant)}</div> : null;
                        })()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatutColor(eleve.statut)}`}>
                      {eleve.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatutFinancierColor(getStatutFinancier(eleve))}`}>
                      {getStatutFinancier(eleve)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onEleveSelect(eleve)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Voir détails"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onEleveSelect(eleve)}
                        className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                        title="Modifier"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(eleve)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

        {filteredEleves.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucun élève trouvé</p>
          </div>
        )}
      </ModuleContainer>
  );
}