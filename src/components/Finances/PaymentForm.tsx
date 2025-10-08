import { useState, useRef, useMemo } from 'react';
import useUnsavedWarning from '../../hooks/useUnsavedWarning';
import useAutoSave from '../../hooks/useAutoSave';
import DiscardModal from '../UI/DiscardModal';
import Button from '../UI/Button';
import { db } from '../../utils/database';
import { Eleve, Classe } from '../../types';
import { formatNomPrenoms } from '../../utils/formatName';
import { useToast } from '../Layout/ToastProvider';
import { computeScheduleForEleve } from '../../utils/payments';
import { echeancesManager } from '../../utils/echeancesManager';

type Props = {
  onCancel: () => void;
  onSubmit: (eleveId: string, montant: number, type: string, modalite: number | 'auto', paiement?: any) => void;
};

export default function PaymentForm({ onCancel, onSubmit }: Props) {
  const classes = db.getAll<Classe>('classes');
  const [selectedClasse, setSelectedClasse] = useState<string>('');
  const [eleveId, setEleveId] = useState<string | ''>('');
  const [isProtege, setIsProtege] = useState(false);
  const [montant, setMontant] = useState<string>('');
  const [type, setType] = useState<string>('scolarite');
  const [modalite, setModalite] = useState<number | 'auto'>('auto');
  const [mode, setMode] = useState<'espece' | 'mobile' | 'cheque' | 'virement'>('espece');
  const [note, setNote] = useState<string>('');
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const initialRef = useRef<any>({ selectedClasse, eleveId, montant, type, modalite, mode, note });
  const isDirty = useMemo(() => {
    try {
      return JSON.stringify({ selectedClasse, eleveId, montant, type, modalite, mode, note }) !== JSON.stringify(initialRef.current || {});
    } catch (e) { return false; }
  }, [selectedClasse, eleveId, montant, type, modalite, mode, note]);
  const controller = useUnsavedWarning(isDirty);

  const autosaveKey = `payment:draft`;
  const { load: loadDraft, clear: clearDraft } = useAutoSave<Record<string, unknown>>(autosaveKey, { selectedClasse, eleveId, montant, type, modalite, mode, note });

  // Load draft on mount
  useEffect(() => {
    try {
      const d = loadDraft();
      if (d) {
        setSelectedClasse((d as any).selectedClasse || '');
        setEleveId((d as any).eleveId || '');
        setMontant((d as any).montant || '');
        setType((d as any).type || 'scolarite');
        setModalite((d as any).modalite || 'auto');
        setMode((d as any).mode || 'espece');
        setNote((d as any).note || '');
        initialRef.current = d;
      }
    } catch (err) { /* ignore */ }
  }, []);

  const generateNumeroRecu = () => 'REC' + Date.now().toString().slice(-8);

  // auto-select modalite: pick first unpaid échéance modalite if available
  const onEleveChange = (id: string) => {
    setEleveId(id);
    const ev = db.getById('eleves', id) as any;
    setIsProtege(!!ev?.protege);
    try {
      const schedule = computeScheduleForEleve(id);
      const firstDue = schedule.find(s => s.remaining > 0);
      if (firstDue) {
        // attempt to parse modality from echeanceId suffix (stable IDs used in seed)
        const parts = String(firstDue.echeanceId).split('-');
        const last = parts[parts.length - 1];
        const n = Number(last);
        if (Number.isFinite(n) && n >= 1 && n <= 7) setModalite(n);
      }
    } catch (err) { console.debug('compute schedule failed', err); }
  };

  const onClasseChange = (id: string) => {
    setSelectedClasse(id);
    // select first eleve of this classe if present
    const list = db.getAll<Eleve>('eleves').filter(x => !id || x.classeId === id);
    if (list.length) {
      onEleveChange(list[0].id);
    } else {
      setEleveId('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Nouveau Paiement</h3>
          <button className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-md transition-colors" onClick={() => { if (isDirty && controller) return controller.openPrompt(); return onCancel(); }} aria-label="Fermer">✕</button>
        </div>

        {/* Content - scrollable */}
        <div className="overflow-y-auto px-4 py-3 space-y-3 flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Classe</label>
            <select 
              value={selectedClasse} 
              onChange={e => onClasseChange(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
            >
              <option value="">-- Toutes les classes --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.niveau} {c.section}</option>)}
            </select>

            <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">Élève</label>
            <select 
              value={eleveId} 
              onChange={e => onEleveChange(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
            >
              <option value="">-- Sélectionner élève --</option>
              {db.getAll<Eleve>('eleves').filter(el => !selectedClasse || el.classeId === selectedClasse).map(el => <option key={el.id} value={el.id}>{el.nom} {el.prenoms} ({el.matricule})</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Montant (FCFA)</label>
            <input 
              type="number" 
              value={montant} 
              onChange={e => setMontant(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors text-lg font-bold"
              placeholder="0"
            />
            {isProtege && (
              <p className="text-xs text-gray-600 mt-1">Élève protégé: montant libre, mais seule l'inscription sera prise en compte.</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type de frais</label>
            <select 
              value={type} 
              onChange={e => setType(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
              disabled={isProtege}
            >
              {isProtege ? (
                <option value="inscription">Inscription</option>
              ) : (
                <>
                  <option value="scolarite">Scolarité</option>
                  <option value="inscription">Inscription</option>
                  <option value="cantine">Cantine</option>
                  <option value="transport">Transport</option>
                  <option value="fournitures">Fournitures</option>
                </>
              )}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Modalité de versement</label>
            <select 
              value={String(modalite)} 
              onChange={e => setModalite(e.target.value === 'auto' ? 'auto' : Number(e.target.value))} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
              disabled={isProtege}
            >
              {isProtege ? (
                <option value={1}>1 - Inscription</option>
              ) : (
                <>
                  <option value="auto">Auto</option>
                  <option value={1}>1 - Inscription</option>
                  <option value={2}>2 - Versement 1</option>
                  <option value={3}>3 - Versement 2</option>
                  <option value={4}>4 - Versement 3</option>
                  <option value={5}>5 - Versement 4</option>
                  <option value={6}>6 - Versement 5</option>
                  <option value={7}>7 - Versement 6</option>
                </>
              )}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mode de paiement</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'espece', label: 'Espèces' },
                { value: 'mobile', label: 'Mobile Money' },
                { value: 'cheque', label: 'Chèque' },
                { value: 'virement', label: 'Virement' }
              ].map(modeOption => (
                <label key={modeOption.value} className={`flex items-center justify-center p-2 border rounded-md cursor-pointer transition-all ${
                  mode === modeOption.value 
                    ? 'border-gray-900 bg-gray-50 text-gray-900' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input
                    type="radio"
                    name="mode"
                    value={modeOption.value}
                    checked={mode === modeOption.value}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="sr-only"
                  />
                  <span className="font-medium text-sm">{modeOption.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Note ou commentaire (optionnel)</label>
            <textarea 
              value={note} 
              onChange={e => setNote(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors resize-none" 
              rows={3}
              placeholder="Commentaire sur ce paiement..."
            />
          </div>
          
        </div>

        {/* Footer - fixed inside modal */}
        <div className="px-4 py-3 border-t bg-white flex flex-col sm:flex-row justify-end gap-2 lg:gap-4">
            <Button variant="secondary" className="w-full sm:w-auto" onClick={() => { if (isDirty && controller) return controller.openPrompt(); return onCancel(); }} disabled={isSaving}>
              Annuler
            </Button>
            <Button 
              variant="primary"
              className="w-full sm:w-auto"
              onClick={async () => {
              if (!eleveId) { showToast('Sélectionnez un élève', 'error'); return; }
              const m = Number(montant || 0);
              if (!m || m <= 0) { showToast('Montant invalide', 'error'); return; }
              setIsSaving(true);
              const numeroRecu = generateNumeroRecu();
              try {
                const meta = { mode, note, numeroRecu, type, modalite } as Record<string, unknown>;
                // include current user if available
                try { const { getCurrentUser } = await import('../../utils/auth'); const cur = getCurrentUser(); if (cur) meta.utilisateur = formatNomPrenoms(cur); } catch (err) { console.debug('getCurrentUser failed', err); }
                const res = echeancesManager.processPaymentIntelligent(eleveId, m, new Date().toISOString(), meta);
                // add historique with current user
                try {
                  const cur = (await import('../../utils/auth')).getCurrentUser();
                  const paiementId = res && res.paiement && res.paiement.id ? String(res.paiement.id) : undefined;
                  db.addHistorique({ type: 'paiement', cible: 'Paiement', cibleId: paiementId, description: `Paiement de ${m} FCFA pour élève ${eleveId} (reçu ${meta.numeroRecu})`, utilisateur: cur ? `${cur.prenoms} ${cur.nom}` : 'Inconnu' });
                } catch (err) { console.debug('historique skip:', err); }
                // show preview in new window
                  try {
                    const eleve = db.getById<Eleve>('eleves', eleveId);
                    const eleveNom = eleve ? formatNomPrenoms(eleve) : '';
                    const html = `
                      <html><head><title>Reçu ${meta.numeroRecu}</title></head><body>
                        <h2>Reçu de paiement</h2>
                        <div>Reçu: ${meta.numeroRecu}</div>
                        <div>Élève: ${eleveNom} (${eleve?.matricule || ''})</div>
                        <div>Montant: ${m} FCFA</div>
                        <div>Mode: ${meta.mode}</div>
                        <div>Date: ${new Date().toLocaleString()}</div>
                      </body></html>`;
                    const w = window.open('', '_blank', 'width=600,height=800');
                    if (w) {
                      w.document.write(html);
                      w.document.close();
                      // trigger print automatically
                      setTimeout(() => { try { w.print(); } catch (err) { console.debug('print failed', err); } }, 300);
                    }
                  } catch (err) { console.debug('preview failed', err); }
                // call parent handler for compatibility
                try { onSubmit(eleveId, m, type, modalite, res.paiement); } catch (err) { console.debug('onSubmit handler error', err); }
                showToast('Paiement enregistré', 'success');
                try { clearDraft(); } catch (err) { /* ignore */ }
                onCancel();
              } catch (err) {
                console.error(err);
                const message = err && (err as any).message ? (err as any).message : 'Erreur lors de l\'enregistrement du paiement';
                showToast(message, 'error');
              } finally {
                setIsSaving(false);
              }
            }} 
            disabled={isSaving}
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-4 w-4 lg:h-5 lg:w-5 border-b-2 border-white"></div>
            ) : (
              <span>Enregistrer</span>
            )}
            <span>{isSaving ? 'Enregistrement...' : 'Paiement'}</span>
          </Button>
        </div>
      </div>
      {/* Discard modal */}
      {controller && (
        <DiscardModal
          open={controller.showPrompt}
          title="Quitter sans sauvegarder ?"
          description="Vous avez des modifications non sauvegardées. Voulez-vous quitter sans enregistrer ?"
          onConfirm={() => {
            try { clearDraft(); } catch (err) { /* ignore */ }
            const winAny: any = window as any;
            try { winAny.__preventReDispatch = true; } catch (e) { /* ignore */ }
            try {
              if ((controller as any).allowNavigation) (controller as any).allowNavigation(); else onCancel();
            } finally {
              setTimeout(() => { try { winAny.__preventReDispatch = false; } catch (e) { /* ignore */ } }, 80);
            }
          }}
          onCancel={() => controller.closePrompt && controller.closePrompt()}
        />
      )}
    </div>
  );
}
