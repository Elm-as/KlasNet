// React import not required with automatic JSX runtime
import RecuPaiement, { Receipt } from './RecuPaiement';
import { getEnteteConfig } from '../../utils/entetesConfig';
import { echeancesManager } from '../../utils/echeancesManager';
// ... no top controls needed here; per-receipt controls remain in RecuPaiement

interface Props {
  // Either a prepared list of receipts... 
  receipts?: Receipt[];
  // ...or the eleve + paiements variant used by ElevePaymentPage
  eleve?: any;
  paiements?: any[];
  classe?: any;
  anneeScolaire?: string;
  totalAttendu?: number;
  title?: string;
}

export default function CombinedRecu({ receipts = [], eleve, paiements, classe, totalAttendu, title = 'Reçus de Paiement' }: Props) {
  // Build receipts list: prefer explicit `receipts` prop; otherwise map `paiements` -> Receipt
  let list: Receipt[] = [];
  if (Array.isArray(receipts) && receipts.length > 0) {
    list = receipts;
  } else if (Array.isArray(paiements) && paiements.length > 0) {
    // Aggregate paiements by student so that each student has a single Receipt
    const map = new Map<string, any>();
    paiements.forEach((p: any) => {
      const key = p.eleveId || p.eleveMatricule || `${p.eleveNom || ''}|${p.elevePrenoms || ''}`;
      const amount = p.montant || p.montantTtc || 0;
      const mode = p.modePaiement || p.paiementType || 'Espèces';
      const date = p.datePaiement || p.createdAt;
      const nb = p.nbEcheances || p.nombreEcheances || 1;
      // Prefer to show the configured libellé/label of the échéance when available
      let labelText = '';
      try {
        const sit = p.eleveId ? echeancesManager.getSituationEcheances(p.eleveId) : null;
        if (sit) {
          if (Array.isArray(p.allocations) && p.allocations.length > 0) {
            const labels = p.allocations.map((a: any) => {
              const found = (sit.echeances || []).find((e: any) => e.echeanceId === a.echeanceId || e.echeanceId === `${(sit.classe && sit.classe.niveau) || ''}-${a.modalite}`);
              return found ? found.label : (a.label || '');
            }).filter(Boolean);
            if (labels.length > 0) labelText = labels.join(' · ');
          }

          // If no allocations / labels found, try to infer by modalite or versementIndex or by amount
          if (!labelText) {
            let modalite: number | null = null;
            if (p.modalite) modalite = Number(p.modalite);
            else if (p.versementIndex != null) modalite = Number(p.versementIndex) + 1;
            else if (p.typeFrais === 'inscription') modalite = 1;

            if (modalite) {
              const found = (sit.echeances || []).find((e: any) => Number(e.modalite) === Number(modalite));
              if (found) labelText = found.label || '';
            }

            // Fallback: match by montant exactly (some payments record no allocations)
            if (!labelText) {
              const foundByAmount = (sit.echeances || []).find((e: any) => Number(e.montant) === Number(amount));
              if (foundByAmount) labelText = foundByAmount.label || '';
            }
          }
        }
      } catch (e) {
        // ignore and fallback
      }

      if (!labelText) labelText = p.notes || (p as any).numeroRecu || `Règlement de ${nb} échéance(s)`;
      const description = `${labelText}${mode ? ' - ' + mode : ''}`;
      const item = { description: `${date ? new Date(date).toLocaleDateString('fr-FR') + ' · ' : ''}${description}`, montant: amount };

      if (!map.has(key)) {
        map.set(key, {
          eleve: {
            id: p.eleveId,
            nom: p.eleveNom || p.eleve?.nom || (eleve ? eleve.nom : '') || '',
            prenoms: p.elevePrenoms || p.eleve?.prenoms || (eleve ? eleve.prenoms : '') || '',
            matricule: p.eleveMatricule || p.eleve?.matricule || (eleve ? eleve.matricule : '') || '',
            classe: classe ? `${classe.niveau || ''} ${classe.section || ''}` : p.classe || p.classeNom || ''
          },
          payeur: p.payeur || p.nomPayeur,
          paiementType: mode,
          items: [item],
          montantTotal: amount,
          ids: [p.id]
        });
      } else {
        const entry = map.get(key);
        entry.items.push(item);
        entry.montantTotal = (entry.montantTotal || 0) + amount;
        entry.ids.push(p.id);
      }
    });

    list = Array.from(map.values()).map((v: any) => ({
      id: (v.ids && v.ids[0]) || String(Math.random()).slice(2),
      numero: undefined,
      eleve: v.eleve,
      payeur: v.payeur,
      items: v.items,
      montantTotal: v.montantTotal,
      date: undefined,
      paiementType: v.paiementType,
      user: undefined,
      notes: undefined
    } as Receipt));
  }

  // Build pages of two receipts
  const pages: Array<Receipt[]> = [];
  for (let i = 0; i < list.length; i += 2) pages.push([list[i], list[i + 1]].filter(Boolean) as Receipt[]);

  const entete = getEnteteConfig('recu') as any;

  return (
    <div className="combined-recu-root">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
      </div>

      <div id="combined-print-area">
        {pages.length === 0 && <div style={{ padding: 24 }}>Aucun reçu</div>}
        {pages.map((pair, idx) => (
          <div key={idx} className="print-page-two-up" style={{ padding: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pair.map((r) => {
                // Use provided totalAttendu if available, otherwise approximate from items
                const tAtt = typeof totalAttendu === 'number' ? totalAttendu : r.montantTotal;
                const tPaye = r.montantTotal;
                const tRest = Math.max(0, (tAtt || 0) - tPaye);
                // reference eleve to avoid unused variable lint when eleve prop exists
                // Ensure eleve prop is passed correctly and not overridden
                const receiptProps = {
                  receipt: r,
                  totalAttendu: tAtt,
                  totalPaye: tPaye,
                  totalRestant: tRest,
                  entete,
                  eleve: r.eleve || eleve, // pass r.eleve explicitly
                };

                return (
                  <div key={r.id} style={{ marginBottom: 6 }}>
                    <RecuPaiement {...receiptProps} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          body > *:not(#combined-print-area):not(script):not(style) { display: none !important; }
          #combined-print-area { width: 210mm; margin: 0 auto; }
          .print-page-two-up { min-height: 297mm; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
          .print-page-two-up:last-child { page-break-after: auto; }
          .print-page-two-up > div { height: 100%; display:flex; flex-direction:column; justify-content:space-between; }
          .receipt-compact { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}