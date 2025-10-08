import { useEffect, useState } from 'react';
import ModuleContainer from '../Layout/ModuleContainer';
import Button from '../UI/Button';
import { passageAnneeScolaire } from '../../utils/passageAnnee';
import { db } from '../../utils/database';
import { CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';

export default function ConfigPassageAnnee() {
  const [useDfa, setUseDfa] = useState(true);
  const [seuil, setSeuil] = useState<number>(10);
  const [nouvelleAnnee, setNouvelleAnnee] = useState<string>(() => {
    const y = new Date().getFullYear() + 1;
    return `${y}-${y + 1}`;
  });
  const [preserveEleves, setPreserveEleves] = useState(true);
  const [resetFinances, setResetFinances] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [preview, setPreview] = useState<{ promoted: number; heldBack: number; total: number }>({ promoted: 0, heldBack: 0, total: 0 });

  const handleRun = () => {
    // Show confirmation modal first
    setShowConfirm(true);
    setConfirmText('');
  };

  const handleConfirm = async () => {
    if (confirmText.trim() !== nouvelleAnnee.trim()) {
      setMessage('La confirmation ne correspond pas à la nouvelle année. Tapez exactement la valeur affichée pour confirmer.');
      return;
    }

    setShowConfirm(false);
    setIsRunning(true);
    setMessage(null);
    try {
      const result = passageAnneeScolaire({
        useDFA: useDfa,
        seuilAdmission: seuil,
        nouvelleAnnee,
        preserveEleves,
        resetFinances
      });
      setMessage(`Opération terminée. Promus: ${result?.promoted ?? 0}, Redoublants: ${result?.heldBack ?? 0}`);
    } catch (e: any) {
      setMessage(`Erreur: ${e?.message || String(e)}`);
    } finally {
      setIsRunning(false);
    }
  };

  // compute preview (non-destructive) when settings change
  const computePreview = () => {
    const eleves = db.getAll<any>('eleves');
    const classes = db.getAll<any>('classes');
    const notes = db.getAll<any>('notes');

    // build averages normalized to /20
    const byEleve: Record<string, number[]> = {};
    notes.forEach((n: any) => {
      const eleveId = n.eleveId;
      const raw = Number(n.valeur || 0);
      const bareme = Number(n.bareme || 20) || 20;
      const normalized = (raw / bareme) * 20;
      byEleve[eleveId] = byEleve[eleveId] || [];
      byEleve[eleveId].push(normalized);
    });

    const computed: Record<string, number> = {};
    Object.keys(byEleve).forEach(id => {
      const arr = byEleve[id];
      const avg = arr.reduce((s, a) => s + a, 0) / arr.length;
      computed[id] = Math.round(avg * 100) / 100;
    });

  let promoted = 0;
    let heldBack = 0;

    eleves.forEach((eleve: any) => {
      const moyenne = computed[eleve.id] ?? 0;
      const classeActuelle = classes.find((c: any) => c.id === eleve.classeId);
      if (!classeActuelle) return;
      if (moyenne >= seuil) {
        // promotion possible (count only if there is next level or mark inactive)
        promoted++;
      } else {
        heldBack++;
      }
    });

    setPreview({ promoted, heldBack, total: eleves.length });
  };

  useEffect(() => {
    // compute preview on first render and when settings change
    computePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useDfa, seuil, nouvelleAnnee, preserveEleves]);

  return (
    <ModuleContainer title="Passage d'année scolaire" subtitle="Clôturer l'année actuelle et préparer la nouvelle">
      <div className="space-y-6">
        <div className="bg-white p-4 rounded border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">Préparation du passage</h2>
              <p className="text-sm text-gray-600 mt-1">Les moyennes sont normalisées sur une échelle sur 20 avant décision. Par exemple, une moyenne 5/10 est convertie en 10/20 — le seuil d'admission est donc comparé sur /20.</p>
            </div>
            <div className="text-sm text-gray-500 flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span>Opération irréversible — une archive sera proposée</span>
            </div>
          </div>
          <label className="flex items-center space-x-3">
            <input type="checkbox" checked={useDfa} onChange={(e) => setUseDfa(e.target.checked)} />
            <span>Utiliser DFA (moyennes) pour promouvoir les élèves</span>
          </label>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <label className="text-sm text-gray-700">Seuil admission (sur 20)</label>
              <input type="number" value={seuil} onChange={(e) => setSeuil(Number(e.target.value))} className="border rounded px-2 py-1 w-20" />
            </div>

            <div>
              <label className="block text-sm text-gray-700">Nouvelle année scolaire</label>
              <input value={nouvelleAnnee} onChange={(e) => setNouvelleAnnee(e.target.value)} className="border rounded px-2 py-1 w-48 mt-1" />
            </div>

            <div className="flex flex-col space-y-2">
              <label className="flex items-center space-x-3">
                <input type="checkbox" checked={useDfa} onChange={(e) => setUseDfa(e.target.checked)} />
                <span>Utiliser DFA (moyennes)</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" checked={preserveEleves} onChange={(e) => setPreserveEleves(e.target.checked)} />
                <span>Conserver les élèves (désaffecter si besoin)</span>
              </label>
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-sm text-gray-700">Nouvelle année scolaire</label>
            <input value={nouvelleAnnee} onChange={(e) => setNouvelleAnnee(e.target.value)} className="border rounded px-2 py-1 w-48 mt-1" />
          </div>

          <div className="mt-3">
            <label className="flex items-center space-x-3">
              <input type="checkbox" checked={resetFinances} onChange={(e) => setResetFinances(e.target.checked)} />
              <span>Réinitialiser les paiements / finances</span>
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button onClick={handleRun} disabled={isRunning} variant="danger">{isRunning ? 'Exécution...' : 'Lancer le passage'}</Button>
              <Button onClick={() => { setMessage(null); }} variant="ghost">Effacer</Button>
            </div>
            <div className="flex items-center space-x-2">
              <button className="flex items-center text-sm text-gray-600 hover:text-gray-900" onClick={computePreview} title="Rafraîchir l'aperçu">
                <RefreshCw className="w-4 h-4 mr-2" /> Rafraîchir l'aperçu
              </button>
            </div>
          </div>

          {message && (
            <div className="mt-4 p-3 bg-gray-50 border rounded text-sm">
              {message}
            </div>
          )}
        </div>

        {/* Preview panel */}
        <div className="bg-white p-4 rounded border border-gray-200">
          <h3 className="text-md font-semibold mb-2">Aperçu (non destructif)</h3>
          <p className="text-sm text-gray-600">Estimation basée sur les notes existantes (toutes normalisées sur 20).</p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <div className="text-lg font-bold">{preview.promoted}</div>
                <div className="text-sm text-gray-600">Promus estimés</div>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              <div>
                <div className="text-lg font-bold">{preview.heldBack}</div>
                <div className="text-sm text-gray-600">Redoublants estimés</div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded flex items-center space-x-3">
              <XCircle className="w-6 h-6 text-gray-600" />
              <div>
                <div className="text-lg font-bold">{preview.total}</div>
                <div className="text-sm text-gray-600">Total élèves analysés</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation modal (simple implementation) */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold">Confirmer le passage d'année</h3>
            <p className="text-sm text-gray-700 mt-2">Cette opération est irréversible. Pour confirmer, tapez exactement la nouvelle année scolaire :</p>
            <div className="mt-3 font-mono text-sm bg-gray-100 p-2 rounded">{nouvelleAnnee}</div>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Tapez la nouvelle année pour confirmer" className="mt-3 w-full border rounded px-2 py-1" />

            <div className="mt-4 flex justify-end space-x-3">
              <Button variant="ghost" onClick={() => setShowConfirm(false)}>Annuler</Button>
              <Button variant="danger" onClick={handleConfirm}>Confirmer et lancer</Button>
            </div>
          </div>
        </div>
      )}
    </ModuleContainer>
  );
}
