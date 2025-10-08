// React import not required with the automatic JSX runtime
import { formatNomPrenoms } from '../../utils/formatName';
import { openReceiptsPreviewFromElementId } from '../../utils/printHandlers/receipts';
import Button from '../UI/Button';
import { Printer, Download } from 'lucide-react';
import { getEnteteConfig } from '../../utils/entetesConfig';
import { db } from '../../utils/database';
import { getCurrentUser } from '../../utils/auth';
import { echeancesManager } from '../../utils/echeancesManager';

export interface ReceiptItem {
  description: string;
  quantite?: number;
  montant: number;
}

export interface Receipt {
  id: string;
  numero?: string;
  eleve: { id?: string; nom: string; prenoms?: string; matricule?: string; classe?: string };
  payeur?: string;
  items: ReceiptItem[];
  montantTotal: number;
  date?: string;
  paiementType?: string;
  user?: string;
  notes?: string;
}

type Props = { receipt?: Receipt | null } | any;

export default function RecuPaiement(props: Props) {
  let r = (props as any).receipt as Receipt | undefined;
  // If no receipt object provided, try to build one from single-payment props (form modal)
  if (!r && (props as any).montantRegle != null) {
    const eleveProp = (props as any).eleve || {};
    const itemDesc = (props as any).numeroRecu || (props as any).notes || 'Paiement';
    const montant = Number((props as any).montantRegle || 0);
    r = {
      id: String((props as any).numeroRecu || 'tmp-' + Date.now()),
      numero: (props as any).numeroRecu,
      eleve: { nom: eleveProp.nom || '', prenoms: eleveProp.prenoms || '', matricule: eleveProp.matricule || '', classe: eleveProp.classe || '' },
      payeur: (props as any).payeur || eleveProp.nom || '',
      items: [ { description: itemDesc, montant } ],
      montantTotal: montant,
      date: (props as any).date,
      paiementType: (props as any).mode,
      user: (props as any).operateur || (props as any).user,
      notes: (props as any).notes || ''
    } as Receipt;

    // Try to enrich items from a matching paiement in the DB (so allocation labels like "Inscription" show)
      try {
        const match = db.getAll('paiements').find((p: any) => p.numeroRecu === r!.numero || p.datePaiement === r!.date || (p.eleveId && p.eleveId === (eleveProp.id))) as any;
        if (match && match['allocations'] && Array.isArray(match['allocations']) && match['allocations'].length > 0) {
          const itemsFromAlloc = match['allocations'].map((a: any) => {
            let ech = null;
            if (a && a.echeanceId) {
              ech = db.getById('echeances', a.echeanceId as string) as any;
              if (!ech) {
                // fallback: sometimes fixtures store echeanceId on the record instead of using id
                ech = db.getAll('echeances').find((x: any) => x.echeanceId === a.echeanceId || x.echeanceId === (a.echeanceId as string));
              }
            }
            // Use label from echeance if available, else description, else modalite, else default 'Paiement'
            const description = ech?.label?.trim() || (a.description ? a.description.trim() : '') || (a.modalite ? `Modalité ${a.modalite}` : 'Paiement');
            return { description, montant: a.montant || 0 } as ReceiptItem;
          });
          r.items = itemsFromAlloc;
    r.montantTotal = (itemsFromAlloc.reduce((s: number, it: ReceiptItem) => s + (it.montant || 0), 0));
        }
      } catch (e) { /* ignore */ }
  }
  const enteteProp = (props as any).entete as any | undefined;
  const cfgEntete = getEnteteConfig('recu') as any;
  const entete = enteteProp || cfgEntete || {};
  if (!r) return <div className="p-4 text-sm text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">Aucun reçu à afficher</div>;

  const formatCurrency = (n: number) => n.toLocaleString('fr-FR');

  // Determine totals (accept multiple prop names used across the app)
  const situation = (() => {
    try {
      const eleveId = r?.eleve?.id || (props as any).eleve?.id;
      return eleveId ? echeancesManager.getSituationEcheances(eleveId) : null;
    } catch (e) {
      return null;
    }
  })();

  const providedTotalPaye = Number((props as any).totalPaye ?? (props as any).cumulReglement ?? (situation ? situation.totalPaye : NaN));
  let providedTotalRestant = (props as any).totalRestant ?? (props as any).resteAPayer ?? (situation ? situation.totalRestant : undefined);
  let totalAttendu = (props as any).totalAttendu ?? (props as any).totalDu ?? (situation ? situation.totalDu : undefined);

  const totalPaye = Number.isFinite(providedTotalPaye) ? providedTotalPaye : (r ? Number(r.montantTotal || 0) : 0);
  if (totalAttendu == null) {
    if (providedTotalRestant != null) totalAttendu = totalPaye + Number(providedTotalRestant);
    else if (situation) totalAttendu = situation.totalDu;
    else totalAttendu = totalPaye || (r ? r.montantTotal : 0);
  }
  if (providedTotalRestant == null) {
    providedTotalRestant = Math.max(0, Number(totalAttendu || 0) - Number(totalPaye || 0));
  }
  const totalRestant = Number(providedTotalRestant || 0);

  // NOTE: montant en lettres removed by request; numeric amounts displayed and bolded.

  const isSolde = Number(totalRestant || 0) === 0;

  return (
    <div id={r.id} className="receipt-compact recu simple-recu bg-white border border-gray-300 rounded-md p-4 relative" data-recu-id={r.id} style={{ minHeight: '320px', boxSizing: 'border-box' }}>
      {/* Soldé badge */}
      {isSolde ? (
        <div style={{ position: 'absolute', top: 12, right: 12, background: '#059669', color: 'white', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, zIndex: 10, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
          SOLDÉ
        </div>
      ) : null}
      <div className="entete flex justify-between items-center mb-2">
        <div className="text-left">
          <div className="text-base font-bold entete-libelle">{entete.etablissement || entete.header || 'Votre École'}</div>
          <div className="text-xs">Reçu de paiement</div>
        </div>
        <div className="text-right">
          {entete.logo ? <img src={entete.logo} alt="logo" style={{ height: 48, objectFit: 'contain' }} /> : null}
        </div>
      </div>

      <div className="student-row mb-3 flex justify-between text-xs">
        <div>
          <div><strong>Élève :</strong> {formatNomPrenoms(r.eleve)} {r.eleve.matricule ? `(${r.eleve.matricule})` : ''}</div>
          <div><strong>Classe :</strong> {r.eleve.classe || '—'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div><strong>Mode :</strong> {r.paiementType || 'Espèces'}</div>
          <div className="mt-1">{r.date ? new Date(r.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</div>
        </div>
      </div>


      <div className="items mb-3 text-xs" style={{ maxHeight: 'none', overflowY: 'visible' }}>
          {r.items.map((it, i) => {
            // Extract date and time from description if present (e.g., "05/10/2025 14:30 · Inscription")
            const dateTimeMatch = it.description.match(/^(\d{2}\/\d{2}\/\d{4})(?: (\d{2}:\d{2}))? · /);
            const dateStr = dateTimeMatch ? dateTimeMatch[1] : '';
            const timeStr = dateTimeMatch && dateTimeMatch[2] ? dateTimeMatch[2] : '';
            const descWithoutDate = dateTimeMatch ? it.description.replace(/^(\d{2}\/\d{2}\/\d{4})(?: \d{2}:\d{2})? · /, '') : it.description;
            return (
              <div key={i} style={{ padding: '2px 0', fontWeight: 600, fontSize: 14, lineHeight: '1.3' }}>
                {dateStr && <span style={{ marginRight: 8 }}>{dateStr}</span>}
                {timeStr && <span style={{ marginRight: 8 }}>{timeStr}</span>}
                Paiement : <span style={{ fontWeight: 700, marginLeft: 4 }}>{formatCurrency(it.montant)} FCFA</span>
              </div>
            );
          })}
      </div>

      <div className="summary-box mb-4 text-xs" style={{ borderTop: '1px solid #ddd', paddingTop: 8 }}>
        <div className="grid grid-cols-1 gap-1">
          <div><strong>Total attendu:</strong> <span className="font-bold">{formatCurrency(Number(totalAttendu || 0))} FCFA</span></div>
          <div><strong>Total cumulé payé:</strong> <span className="font-bold">{formatCurrency(Number(totalPaye || 0))} FCFA</span></div>
          <div className="print-deadline"><strong>Reste à payer:</strong> <span className="font-bold">{formatCurrency(Number(totalRestant || 0))} FCFA</span></div>
        </div>
      </div>

  <div className="total text-right text-sm font-bold mb-3 print-important" style={{ fontSize: '1.1rem' }}>
    TOTAL — <span className="font-bold">{formatCurrency(r.montantTotal)} FCFA</span>
  </div>

      <div className="mt-2 text-xs text-left">
  <div><strong>Opérateur :</strong> <span className="font-bold">{(r.user as string) || (props as any).user || (() => { const cur = getCurrentUser(); return cur ? formatNomPrenoms(cur) : 'ADMIN'; })()}</span></div>
      </div>
      <div className="mt-4 flex gap-3 justify-end">
        <Button variant="secondary" onClick={() => openReceiptsPreviewFromElementId(r.id, 'Aperçu reçu', false)}>
          <Printer className="h-4 w-4" /> Aperçu
        </Button>
        <Button onClick={() => openReceiptsPreviewFromElementId(r.id, 'Imprimer reçu (2/page)', true)}>
          <Download className="h-4 w-4" /> Imprimer 2/page
        </Button>
      </div>
    </div>
  );
}
