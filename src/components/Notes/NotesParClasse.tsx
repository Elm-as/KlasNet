import { useState, useMemo, useEffect, useRef } from 'react';
import useUnsavedWarning from '../../hooks/useUnsavedWarning';
import useAutoSave from '../../hooks/useAutoSave';
import DiscardModal from '../UI/DiscardModal';
import { db } from '../../utils/database';
import { formatNomPrenoms } from '../../utils/formatName';
import { Eleve, Classe, Matiere, Note, CompositionConfig, MoyenneEleve } from '../../types';
import { useToast } from '../Layout/ToastProvider';
import { Save, BookOpen, Users, Calculator, Trophy, Target } from 'lucide-react';
// print preview removed for now

export default function NotesParClasse() {
  const { showToast } = useToast();
  const [selectedClasseId, setSelectedClasseId] = useState('');
  const [selectedComposition, setSelectedComposition] = useState('');
  const [notes, setNotes] = useState<Record<string, Record<string, number>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [moyenneBase, setMoyenneBase] = useState<10 | 20>(20);

  const classes = useMemo(() => db.getAll<Classe>('classes'), []);
  const compositions = useMemo(() => db.getAll<CompositionConfig>('compositions'), []);
  const allNotes = useMemo(() => db.getAll<Note>('notes'), []);

  const selectedClasse = classes.find(c => c.id === selectedClasseId);
  const elevesClasse = useMemo(() => {
    return db.getAll<Eleve>('eleves')
      .filter(e => e.classeId === selectedClasseId && e.statut === 'Actif')
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [selectedClasseId]);

  // Compositions pour le niveau de la classe sélectionnée
  const compositionsNiveau = useMemo(() => {
    if (!selectedClasse) return compositions;
    return compositions.filter(c => 
      !c.niveau || c.niveau === selectedClasse.niveau
    ).sort((a, b) => a.ordre - b.ordre);
  }, [selectedClasse, compositions]);

  // Matières de la classe sélectionnée
  // charger la liste maître des matières puis résoudre les matières stockées dans la classe
  const allMatieresMaster = useMemo(() => db.getAll<Matiere>('matieres'), []);

  // ref to keep the initial loaded notes for dirty-check
  const initialNotesRef = useRef<Record<string, Record<string, number>>>({});

  // hook to warn user when leaving with unsaved changes
  // NOTE: use static import to avoid runtime require errors in the browser
  // (import placed at top of file)

  const matieresClasse = useMemo(() => {
    if (!selectedClasse) return [];
    const raw = selectedClasse.matieres || [];

    const resolved: Matiere[] = (raw as any[]).map(item => {
      // cas où on a uniquement l'id stocké
      if (typeof item === 'string') {
        const found = allMatieresMaster.find(m => m.id === item);
        return found || { id: item, nom: item, abreviation: item, coefficient: 1, type: 'Fondamentale', baremeParNiveau: {} } as Matiere;
      }

      // si c'est déjà un objet matière complet avec abreviation
      if (item && typeof item === 'object' && item.abreviation) return item as Matiere;

      // sinon tenter de retrouver par id ou par nom dans la liste maître
      const maybeId = (item && (item as any).id) || null;
      const maybeNom = (item && (item as any).nom) || null;
      let found = null as Matiere | null;
      if (maybeId) found = allMatieresMaster.find(m => m.id === maybeId) || null;
      if (!found && maybeNom) found = allMatieresMaster.find(m => m.nom === maybeNom) || null;
      if (found) return found;

      // fallback: coerce un objet Matiere minimal pour éviter valeurs undefined dans l'UI
      const fallbackAbreviation = (item && (item as any).abreviation) || (maybeNom ? String(maybeNom).slice(0, 3).toUpperCase() : '—');
      return {
        id: maybeId || (item && (item as any).id) || Math.random().toString(36).slice(2, 9),
        nom: maybeNom || (item && (item as any).nom) || 'Matière',
        abreviation: fallbackAbreviation,
        coefficient: (item && (item as any).coefficient) || 1,
        type: (item && (item as any).type) || 'Fondamentale',
        baremeParNiveau: (item && (item as any).baremeParNiveau) || {}
      } as Matiere;
    });

    return resolved.sort((a, b) => a.nom.localeCompare(b.nom));
  }, [selectedClasse, allMatieresMaster]);
  // Charger les notes existantes
  useEffect(() => {
    if (!selectedComposition || !selectedClasseId) return;

    const notesExistantes: Record<string, Record<string, number>> = {};
    elevesClasse.forEach(eleve => {
      notesExistantes[eleve.id] = {};
      matieresClasse.forEach(matiere => {
        const note = allNotes.find(n => 
          n.eleveId === eleve.id && 
          n.matiereId === matiere.id && 
          n.compositionId === selectedComposition &&
          n.classeId === selectedClasseId
        );
        if (note) {
          notesExistantes[eleve.id][matiere.id] = note.valeur;
        }
      });
    });

    // Avoid replacing notes state with a new identical object on every render,
    // which can cause a render loop if callers recreate dependencies each render.
    setNotes(prev => {
      try {
        const prevJson = JSON.stringify(prev || {});
        const nextJson = JSON.stringify(notesExistantes || {});
        if (prevJson === nextJson) return prev;
      } catch (err) {
        // If serialization fails for any reason, fall back to replacing state.
      }
      return notesExistantes;
    });
    // set initial snapshot for dirty checking
    try {
      initialNotesRef.current = JSON.parse(JSON.stringify(notesExistantes || {}));
    } catch (e) {
      initialNotesRef.current = notesExistantes || {};
    }
  }, [selectedComposition, selectedClasseId, elevesClasse, matieresClasse, allNotes]);

  // detect dirty state: compare current notes with initial snapshot
  const isDirty = useMemo(() => {
    try {
      return JSON.stringify(initialNotesRef.current || {}) !== JSON.stringify(notes || {});
    } catch (e) {
      return false;
    }
  }, [notes]);

  // register unsaved changes warning
  const controller = useUnsavedWarning(isDirty);

  // autosave notes
  const autosaveKey = `notes:${selectedClasseId}:${selectedComposition}`;
  const { load: loadDraft, clear: clearDraft, saveNow } = useAutoSave<Record<string, Record<string, number>>>(autosaveKey, notes);

  // load draft when selection changes
  useEffect(() => {
    if (!selectedClasseId || !selectedComposition) return;
    try {
      const d = loadDraft();
      if (d) setNotes(prev => ({ ...prev, ...(d as any) }));
    } catch (err) { /* ignore */ }
  }, [selectedClasseId, selectedComposition]);

  // When notes change we also ensure the immediate-save is available for guards
  useEffect(() => {
    // no-op, just to ensure effect depends on notes so saveNow has latest via hook's ref
    // caller can call window.__autosaveHandlers to force immediate persist
  }, [notes]);

  // Open notes entry from dashboard shortcut
  useEffect(() => {
    const onOpenNotes = () => {
      if (!selectedClasseId && classes.length > 0) {
        setSelectedClasseId(classes[0].id);
      }
      if (!selectedComposition && compositionsNiveau.length > 0) {
        setSelectedComposition(compositionsNiveau[0].id);
      }
    };
    window.addEventListener('open-notes-entry', onOpenNotes as EventListener);
    return () => window.removeEventListener('open-notes-entry', onOpenNotes as EventListener);
  }, [selectedClasseId, selectedComposition, classes, compositionsNiveau]);

  const handleNoteChange = (eleveId: string, matiereId: string, valeur: number) => {
    // clamp to a reasonable numeric value and ensure not NaN
    const matiere = matieresClasse.find(m => m.id === matiereId);
    const bareme = matiere && selectedClasse ? getBaremeMatiere(matiere, selectedClasse.niveau) : 20;
    let v = Number.isFinite(Number(valeur)) ? Number(valeur) : 0;
    if (v < 0) v = 0;
    if (v > bareme) v = bareme;
    setNotes(prev => ({
      ...prev,
      [eleveId]: {
        ...prev[eleveId],
        [matiereId]: v
      }
    }));
  };

  const getBaremeMatiere = (matiere: Matiere, niveau: string): number => {
    return matiere.baremeParNiveau?.[niveau]?.max || 20;
  };

  const calculateTotal = (eleveId: string): number => {
    if (!notes[eleveId]) return 0;
    return matieresClasse.reduce((total, matiere) => {
      const note = notes[eleveId][matiere.id] || 0;
      return total + note;
    }, 0);
  };

  const calculateMoyenne = (eleveId: string): number => {
    if (!notes[eleveId] || !selectedClasse) return 0;
    
    let totalPoints = 0;
    let totalPossible = 0;

    matieresClasse.forEach(matiere => {
      const note = notes[eleveId][matiere.id] || 0;
      const bareme = getBaremeMatiere(matiere, selectedClasse.niveau);
      
      // Convertir la note selon la base de moyenne choisie
      const noteConvertie = moyenneBase === 20 
        ? (note / bareme) * 20 
        : (note / bareme) * 10;
      
      totalPoints += noteConvertie * matiere.coefficient;
      totalPossible += moyenneBase * matiere.coefficient;
    });

    return totalPossible > 0 ? (totalPoints / totalPossible) * moyenneBase : 0;
  };

  // calculateRang removed - use ranksMap from computeMoyennesAndRanks

  // Compute all moyennes and ranks (standard competition ranking)
  const computeMoyennesAndRanks = () => {
    const list = elevesClasse.map(e => ({ eleveId: e.id, moyenne: calculateMoyenne(e.id) }));

    // Map of all moyennes (including zeros)
    const moyennesMap: Record<string, number> = {};
    list.forEach(it => { moyennesMap[it.eleveId] = it.moyenne; });

    // Consider only eleves with moyenne > 0 for ranking
    const filtered = list.filter(l => l.moyenne > 0);
    filtered.sort((a, b) => b.moyenne - a.moyenne);

    const ranksMap: Record<string, number> = {};
    let prevMoy = Number.NaN;
    let prevRank = 0;
    for (let i = 0; i < filtered.length; i++) {
      const item = filtered[i];
      if (!Number.isNaN(prevMoy) && Math.abs(item.moyenne - prevMoy) < 1e-9) {
        // same moyenne -> same rank as previous (standard competition ranking)
        ranksMap[item.eleveId] = prevRank;
      } else {
        const rank = i + 1; // position-based rank (will skip after ties)
        ranksMap[item.eleveId] = rank;
        prevRank = rank;
        prevMoy = item.moyenne;
      }
    }

    return { moyennesMap, ranksMap, sortedByRank: filtered } as const;
  };

  const { moyennesMap, ranksMap, sortedByRank } = useMemo(() => computeMoyennesAndRanks(), [elevesClasse, matieresClasse, notes, moyenneBase, selectedComposition, selectedClasseId]);

  // Sorting mode for display: by name (default) or by rank
  const [sortMode, setSortMode] = useState<'nom' | 'rang'>('nom');

  const displayedEleves = useMemo(() => {
    if (sortMode === 'nom') return [...elevesClasse].sort((a, b) => a.nom.localeCompare(b.nom));
    // sort by rank: ranked students first (in order), then unranked by name
    const rankedIds = sortedByRank.map(s => s.eleveId);
    const ranked = rankedIds.map(id => elevesClasse.find(e => e.id === id)).filter(Boolean) as Eleve[];
    const unranked = elevesClasse.filter(e => !rankedIds.includes(e.id)).sort((a, b) => a.nom.localeCompare(b.nom));
    return [...ranked, ...unranked];
  }, [sortMode, elevesClasse, sortedByRank]);

  const handleSaveNotes = async () => {
    if (!selectedComposition || !selectedClasseId) {
      showToast('Sélectionnez une classe et une composition', 'error');
      return;
    }

    setIsSaving(true);
    try {
      // Sauvegarder toutes les notes
      Object.entries(notes).forEach(([eleveId, notesEleve]) => {
        Object.entries(notesEleve).forEach(([matiereId, valeur]) => {
          if (valeur >= 0) {
            const matiere = matieresClasse.find(m => m.id === matiereId);
            if (!matiere || !selectedClasse) return;

            let bareme = getBaremeMatiere(matiere, selectedClasse.niveau);
            // Clamp valeur to [0, bareme]
            let safeVal = Number(valeur) || 0;
            if (safeVal < 0) safeVal = 0;
            if (safeVal > bareme) safeVal = bareme;
            
            const existingNote = allNotes.find(n => 
              n.eleveId === eleveId && 
              n.matiereId === matiereId && 
              n.compositionId === selectedComposition &&
              n.classeId === selectedClasseId
            );

            const noteData = {
              eleveId,
              matiereId,
              compositionId: selectedComposition,
              classeId: selectedClasseId,
              valeur: safeVal,
              bareme,
              date: new Date().toISOString()
            };

            if (existingNote) {
              db.update<Note>('notes', existingNote.id, noteData as Partial<Note>);
            } else {
              db.create('notes', noteData as any);
            }
          }
        });
      });
      
      // Recalculer et sauvegarder les moyennes
      // Use precomputed moyennes and ranks maps to persist consistent values
      Object.keys(moyennesMap).forEach(eleveId => {
        const moyenne = moyennesMap[eleveId];
        const rang = ranksMap[eleveId] || 0;
        if (moyenne > 0) {
          const existingMoyenne = db.getAll<MoyenneEleve>('moyennesGenerales').find(m =>
            m.eleveId === eleveId &&
            m.compositionId === selectedComposition &&
            m.classeId === selectedClasseId
          );

          const moyenneData = {
            eleveId,
            classeId: selectedClasseId,
            compositionId: selectedComposition,
            moyenne,
            rang,
            dateCalcul: new Date().toISOString()
          };

          if (existingMoyenne) {
            db.update<MoyenneEleve>('moyennesGenerales', existingMoyenne.id, moyenneData as Partial<MoyenneEleve>);
          } else {
            db.create('moyennesGenerales', moyenneData as any);
          }
        }
      });
      
      showToast('Notes enregistrées avec succès', 'success');
      // Reset initial snapshot so unsaved warning is cleared
      try {
        initialNotesRef.current = JSON.parse(JSON.stringify(notes || {}));
      } catch (e) {
        initialNotesRef.current = notes || {};
      }
      try { clearDraft(); } catch (err) { /* ignore */ }
    } catch (error) {
      console.error(error);
      showToast('Erreur lors de l\'enregistrement des notes', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardConfirm = () => {
    try { clearDraft(); } catch (err) {}
    if (controller && (controller as any).allowNavigation) (controller as any).allowNavigation();
  };

  const handleDiscardCancel = () => {
    if (controller && controller.closePrompt) controller.closePrompt();
  };

  const getTotalMaximum = (): number => {
    if (!selectedClasse) return 0;
    return matieresClasse.reduce((total, matiere) => {
      return total + getBaremeMatiere(matiere, selectedClasse.niveau);
    }, 0);
  };

  const getDiviseurMoyenne = (): number => {
    if (!selectedClasse) return 1;
    const totalMaximum = getTotalMaximum();
    return moyenneBase === 20 ? totalMaximum / 20 : totalMaximum / 10;
  };

  const handlePrint = () => {
    if (!selectedClasse || !selectedComposition || displayedEleves.length === 0) {
      showToast('Aucune donnée à imprimer', 'error');
      return;
    }

    // Generate table rows
    const rows = displayedEleves.map((eleve, index) => {
      const total = calculateTotal(eleve.id);
      const moyenne = moyennesMap[eleve.id] || 0;
      const rang = ranksMap[eleve.id] || 0;

      const subjectCells = matieresClasse.map(matiere => {
        const note = notes[eleve.id]?.[matiere.id] || '';
        return `<td style="border: 1px solid #333; padding: 8px; text-align: center; background-color: #f9f9f9;">${note}</td>`;
      }).join('\n');

      return `
        <tr>
          <td style="border: 1px solid #333; padding: 8px; text-align: center; background-color: #f9f9f9;">${index + 1}</td>
          <td style="border: 1px solid #333; padding: 8px; text-align: left; background-color: #f9f9f9;">${formatNomPrenoms(eleve)}</td>
          ${subjectCells}
          <td style="border: 1px solid #333; padding: 8px; text-align: center; background-color: #e6ffe6; font-weight: bold;">${total.toFixed(1)}</td>
          <td style="border: 1px solid #333; padding: 8px; text-align: center; background-color: #ffe6e6; font-weight: bold;">${moyenne.toFixed(2)}</td>
          <td style="border: 1px solid #333; padding: 8px; text-align: center; background-color: #f9f9f9; font-weight: bold;">${rang > 0 ? rang : ''}</td>
        </tr>
      `;
    }).join('\n');

    // Generate subject headers
    const subjectHeaders = matieresClasse.map(matiere => 
      `<th style="border: 2px solid #333; padding: 10px; text-align: center; background-color: #4a5568; color: white; font-weight: bold; font-size: 13px;">${matiere.abreviation}</th>`
    ).join('\n');

    const compositionName = compositions.find(c => c.id === selectedComposition)?.nom || 'Composition';

    const html = `
      <html>
        <head>
          <title>Résultats de Composition - ${selectedClasse.niveau} ${selectedClasse.section}</title>
          <style>
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 12px;
              color: #000;
              padding: 15mm;
              line-height: 1.4;
            }
            h2 {
              text-align: center;
              margin-bottom: 20px;
              font-size: 18px;
              font-weight: bold;
            }
            .header-info {
              text-align: center;
              margin-bottom: 30px;
              font-size: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            th {
              border: 2px solid #333;
              padding: 10px;
              text-align: center;
              background-color: #4a5568;
              color: white;
              font-weight: bold;
              font-size: 13px;
            }
            td {
              border: 1px solid #333;
              padding: 8px;
            }
            .signature {
              text-align: right;
              margin-top: 50px;
              font-weight: bold;
              font-size: 14px;
            }
            @media print {
              body { margin: 0; }
              .signature { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h2>Résultats de Composition</h2>
          <div class="header-info">
            <strong>Classe:</strong> ${selectedClasse.niveau} ${selectedClasse.section}<br>
            <strong>Composition:</strong> ${compositionName}<br>
            <strong>Base de moyenne:</strong> /${moyenneBase}
          </div>
          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Noms et Prénoms</th>
                ${subjectHeaders}
                <th>Total</th>
                <th>Moyenne</th>
                <th>Rang</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div class="signature">Signature</div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      showToast('Impossible d\'ouvrir la fenêtre d\'impression', 'error');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    // Use setTimeout to ensure content is loaded before printing
    setTimeout(() => {
      printWindow.print();
      // Don't close immediately, let the user close after printing
      printWindow.onafterprint = () => printWindow.close();
    }, 500);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* En-tête */}
      <div className="bg-white border border-gray-200 p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Notes par Classe</h1>
            <p className="text-gray-600 mt-2">Saisie et calcul des moyennes selon le système ivoirien</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Base de calcul</div>
            <div className="flex space-x-2 mt-2">
              <button
                onClick={() => setMoyenneBase(10)}
                className={`px-3 py-2 rounded-md font-medium transition-all ${
                  moyenneBase === 10 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                /10
              </button>
              <button
                onClick={() => setMoyenneBase(20)}
                className={`px-3 py-2 rounded-md font-medium transition-all ${
                  moyenneBase === 20 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                /20
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tri: Nom ou Rang */}
      <div className="flex items-center justify-end gap-3">
        <div className="text-sm text-gray-600">Trier par :</div>
        <button onClick={() => setSortMode('nom')} className={`px-3 py-1 rounded ${sortMode === 'nom' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>Nom</button>
        <button onClick={() => setSortMode('rang')} className={`px-3 py-1 rounded ${sortMode === 'rang' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>Rang</button>
      </div>

      {/* Sélection de classe et composition */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Sélection des paramètres
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Classe</label>
            <select
              value={selectedClasseId}
              onChange={(e) => {
                setSelectedClasseId(e.target.value);
                setSelectedComposition('');
                setNotes({});
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
            >
              <option value="">Sélectionner une classe</option>
              {classes.map(classe => {
                const effectif = db.getAll<Eleve>('eleves').filter(e => 
                  e.classeId === classe.id && e.statut === 'Actif'
                ).length;
                return (
                  <option key={classe.id} value={classe.id}>
                    {classe.niveau} {classe.section} ({effectif} élèves)
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Composition</label>
            <select
              value={selectedComposition}
              onChange={(e) => {
                setSelectedComposition(e.target.value);
                setNotes({});
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
              disabled={!selectedClasseId}
            >
              <option value="">Sélectionner une composition</option>
              {compositionsNiveau.map(comp => (
                <option key={comp.id} value={comp.id}>
                  {comp.nom} (coeff. {comp.coefficient})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSaveNotes}
              disabled={isSaving || !selectedComposition || !selectedClasseId}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isSaving ? 'Sauvegarde...' : 'Enregistrer'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tableau de saisie des notes */}
      {selectedClasseId && selectedComposition && matieresClasse.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Saisie des notes - {selectedClasse?.niveau} {selectedClasse?.section}
                </h3>
                <p className="text-gray-600 text-sm">
                  {compositions.find(c => c.id === selectedComposition)?.nom} • 
                  Total /{getTotalMaximum()} • 
                  Moyenne /{moyenneBase}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-gray-600">Notes complètes</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {Object.keys(notes).filter(eleveId => {
                      const notesEleve = notes[eleveId] || {};
                      return matieresClasse.every(m => notesEleve[m.id] !== undefined);
                    }).length}/{elevesClasse.length}
                  </div>
                </div>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm shadow hover:bg-indigo-700 flex items-center space-x-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block">
                    <path d="M6 9V2h12v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="6" y="13" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Imprimer</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-900 min-w-[60px]">
                    N°
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-900 min-w-[200px]">
                    Noms et Prénoms
                  </th>
                  {matieresClasse.map(matiere => (
                    <th key={matiere.id} className="border border-gray-300 px-2 py-2 text-center text-sm font-semibold text-gray-900 min-w-[80px]">
                      <div>{matiere.abreviation}</div>
                    </th>
                  ))}
                  <th className="border border-gray-300 px-2 py-2 text-center text-sm font-semibold text-gray-900 min-w-[80px]">
                    <div>Total</div>
                    <div className="text-xs text-gray-500 font-normal">/{getTotalMaximum()}</div>
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-center text-sm font-semibold text-gray-900 min-w-[80px]">
                    <div>Moy</div>
                    <div className="text-xs text-gray-500 font-normal">/{moyenneBase}</div>
                  </th>
                  <th className="border border-gray-300 px-2 py-2 text-center text-sm font-semibold text-gray-900 min-w-[60px]">
                    Rang
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedEleves.map((eleve, index) => {
                  const total = calculateTotal(eleve.id);
                  const moyenne = moyennesMap[eleve.id] || 0;
                  const rang = ranksMap[eleve.id] || 0;
                  
                  return (
                    <tr key={eleve.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <div className="flex items-center space-x-2">
                          {eleve.photo && (
                            <img 
                              src={eleve.photo} 
                              alt={`${eleve.prenoms} ${eleve.nom}`}
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          )}
                          <div className="text-sm font-medium text-gray-900">
                            {formatNomPrenoms(eleve)}
                          </div>
                        </div>
                      </td>
                      {matieresClasse.map(matiere => {
                        const bareme = getBaremeMatiere(matiere, selectedClasse?.niveau || '');
                        const noteValue = notes[eleve.id]?.[matiere.id] || '';
                        
                        return (
                          <td key={matiere.id} className="border border-gray-300 px-2 py-2 text-center">
                            <input
                              type="number"
                              min="0"
                              max={bareme}
                              step="0.5"
                              value={noteValue}
                              onChange={(e) => handleNoteChange(eleve.id, matiere.id, Number(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-center font-bold focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                              placeholder="0"
                            />
                          </td>
                        );
                      })}
                      <td className="border border-gray-300 px-2 py-2 text-center">
                        <div className="font-bold text-blue-600">
                          {total.toFixed(1)}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center">
                        <div className={`font-bold ${
                          moyenne >= (moyenneBase * 0.5) 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {moyenne.toFixed(2)}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center">
                        {rang > 0 && (
                          <div className={`font-bold ${
                            rang === 1 ? 'text-yellow-600' :
                            rang <= 3 ? 'text-green-600' :
                            'text-gray-600'
                          }`}>
                            {rang}
                            {rang === 1 && <Trophy className="inline h-3 w-3 ml-1" />}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {elevesClasse.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucun élève dans cette classe</p>
            </div>
          )}
        </div>
      )}

      {/* Informations sur le calcul */}
      {selectedClasseId && selectedClasse && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Informations sur le calcul des moyennes
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
              <div className="text-center">
                <Target className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                <div className="text-xl font-bold text-gray-900">
                  {getTotalMaximum()}
                </div>
                <p className="text-gray-700 font-medium">Total maximum</p>
                <p className="text-xs text-gray-600 mt-1">
                  Somme des barèmes de toutes les matières
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
              <div className="text-center">
                <Calculator className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                <div className="text-xl font-bold text-gray-900">
                  {getDiviseurMoyenne().toFixed(1)}
                </div>
                <p className="text-gray-700 font-medium">Diviseur</p>
                <p className="text-xs text-gray-600 mt-1">
                  Pour obtenir la moyenne /{moyenneBase}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
              <div className="text-center">
                <BookOpen className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                <div className="text-xl font-bold text-gray-900">
                  {matieresClasse.length}
                </div>
                <p className="text-gray-700 font-medium">Matières</p>
                <p className="text-xs text-gray-600 mt-1">
                  Configurées pour cette classe
                </p>
              </div>
            </div>
          </div>

          {/* Détail des matières et barèmes */}
          <div className="mt-6 bg-gray-50 rounded-md p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Détail des matières</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {matieresClasse.map(matiere => {
                const bareme = getBaremeMatiere(matiere, selectedClasse.niveau);
                const diviseur = moyenneBase === 20 ? bareme / 20 : bareme / 10;
                
                return (
                  <div key={matiere.id} className="bg-white rounded-md p-3 border border-gray-200">
                    <div className="font-medium text-gray-900 text-sm">{matiere.abreviation}</div>
                    <div className="text-lg font-bold text-gray-900">/{bareme}</div>
                    <div className="text-xs text-gray-500">
                      Diviseur: {diviseur.toFixed(1)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Statistiques de la classe */}
      {selectedClasseId && selectedComposition && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Statistiques de la classe
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="text-center p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="text-xl font-bold text-gray-900">{elevesClasse.length}</div>
              <p className="text-gray-600 font-medium">Élèves</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="text-xl font-bold text-green-600">
                {elevesClasse.filter(e => {
                  const moyenne = calculateMoyenne(e.id);
                  return moyenne >= (moyenneBase * 0.5);
                }).length}
              </div>
              <p className="text-gray-600 font-medium">Admis</p>
              <p className="text-xs text-gray-500">≥ {moyenneBase/2}/{moyenneBase}</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="text-xl font-bold text-red-600">
                {elevesClasse.filter(e => {
                  const moyenne = calculateMoyenne(e.id);
                  return moyenne > 0 && moyenne < (moyenneBase * 0.5);
                }).length}
              </div>
              <p className="text-gray-600 font-medium">Échec</p>
              <p className="text-xs text-gray-500">&lt; {moyenneBase/2}/{moyenneBase}</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="text-xl font-bold text-gray-900">
                {(() => {
                  const moyennes = elevesClasse.map(e => calculateMoyenne(e.id)).filter(m => m > 0);
                  return moyennes.length > 0 ? (moyennes.reduce((a, b) => a + b, 0) / moyennes.length).toFixed(2) : '0';
                })()}
              </div>
              <p className="text-gray-600 font-medium">Moy. Classe</p>
              <p className="text-xs text-gray-500">/{moyenneBase}</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="text-xl font-bold text-gray-900">
                {Object.keys(notes).reduce((count, eleveId) => {
                  const notesEleve = notes[eleveId] || {};
                  const notesCount = Object.values(notesEleve).filter(n => n !== undefined && n !== null).length;
                  return count + notesCount;
                }, 0)}
              </div>
              <p className="text-gray-600 font-medium">Notes saisies</p>
              <p className="text-xs text-gray-500">
                / {elevesClasse.length * matieresClasse.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Discard modal shown when navigation attempted with unsaved changes */}
      {controller && (
        <DiscardModal
          open={controller.showPrompt}
          title="Quitter sans sauvegarder ?"
          description="Vous avez des modifications non sauvegardées. Voulez-vous quitter sans enregistrer ?"
          onConfirm={handleDiscardConfirm}
          onCancel={handleDiscardCancel}
        />
      )}
    </div>
  );
}