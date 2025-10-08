import { db } from '../../utils/database';
import { getEnteteConfig } from '../../utils/entetesConfig';
import { openConvocationsPreviewFromElementId } from '../../utils/printHandlers/convocations';

interface ConvocationProps {
  eleve: any;
  echeances: { modalite: number; date: string; attendu: number; paye: number; reste: number }[];
  totalDue: number;
  classe?: any;
  anneeScolaire?: string;
}

import { formatNomPrenoms } from '../../utils/formatName';

export default function Convocation({ eleve, echeances, totalDue, classe, anneeScolaire }: ConvocationProps) {
  return (
    <div className="p-6 print:page-break-after-always">
      <div className="flex justify-end mb-4 space-x-2">
        <button
          className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
            onClick={() => {
            const el = document.getElementById('convocation-print-area');
            if (!el) return;
            if (el.classList.contains('print-five-per-page')) el.classList.remove('print-five-per-page');
            openConvocationsPreviewFromElementId('convocation-print-area', `convocation_${eleve.matricule || 'unknown'}`);
          }}
        >
          Exporter PDF
        </button>
        <button
          className="px-3 py-1 bg-gray-700 text-white rounded-md text-sm"
            onClick={() => {
            const el = document.getElementById('convocation-print-area');
            if (!el) return;
            // ensure the handler receives raw convocation siblings, we mark for convocation flow
            el.classList.add('print-four-per-page');
            openConvocationsPreviewFromElementId('convocation-print-area', `convocation_${eleve.matricule || 'unknown'}_4up`);
            setTimeout(() => el.classList.remove('print-four-per-page'), 500);
          }}
        >
          Exporter (4/pg)
        </button>
      </div>

  <div id="convocation-print-area" className="mx-auto bg-white text-black p-6 shadow-lg border border-gray-200 max-w-[800px] convocation">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {/* Récupérer logo et nom de l'école depuis la DB, fallback sur entete config */}
              {(() => {
                const ecole = db.getAll('ecole')[0] as any;
                const entete = getEnteteConfig('recu');
                const logo = ecole?.logo || entete?.logo || '';
                const nomEcole = ecole?.nom || entete?.header || 'Votre École';
                return (
                  <>
          {logo ? (
            <img src={logo} alt="Logo" className="w-20 h-20 object-contain rounded-md" />
          ) : (
            <div className="w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center text-sm font-semibold text-gray-600">Logo</div>
          )}
                    <div>
                      <div className="text-sm text-gray-600">École</div>
                      <div className="text-xl font-bold">{nomEcole}</div>
                      <div className="text-sm text-gray-500">Année scolaire {anneeScolaire || ''}</div>
                    </div>
                  </>
                );
              })()}
            </div>
          <div className="text-right text-sm">
            <div className="font-medium">Convocation de paiement</div>
            <div className="text-gray-500">Imprimé le {new Date().toLocaleDateString('fr-FR')}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <div className="text-xs text-gray-500">Élève</div>
            <div className="font-semibold text-lg">{formatNomPrenoms(eleve)}</div>
            <div className="text-sm text-gray-600">Matricule : {eleve.matricule || '-'}</div>
            <div className="text-sm text-gray-600">Tél parent : {eleve.pereTuteur || eleve.telephone || eleve.mereTutrice || '-'}</div>
          </div>
          <div className="text-sm">
            <div className="text-xs text-gray-500">Classe</div>
            <div className="font-semibold">{classe ? `${classe.niveau} ${classe.section || ''}` : '-'}</div>
            <div className="mt-2">Année : <span className="font-medium">{anneeScolaire || '-'}</span></div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3 text-base">Modalités impayées</h4>
          <div className="overflow-hidden border rounded-md">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3">Modalité</th>
                  <th className="text-left px-4 py-3">Période</th>
                  <th className="text-right px-4 py-3">Attendu</th>
                  <th className="text-right px-4 py-3">Payé</th>
                  <th className="text-right px-4 py-3">Reste</th>
                </tr>
              </thead>
              <tbody>
                {echeances.map((e, idx) => (
                  <tr key={e.modalite} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3">{e.modalite}</td>
                    <td className="px-4 py-3">{e.date || '-'}</td>
                    <td className="px-4 py-3 text-right">{(e.attendu || 0).toLocaleString('fr-FR')} FCFA</td>
                    <td className="px-4 py-3 text-right text-green-700">{(e.paye || 0).toLocaleString('fr-FR')} FCFA</td>
                    <td className="px-4 py-3 text-right text-red-700 font-medium">{(e.reste || 0).toLocaleString('fr-FR')} FCFA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-700 print-important">
            <strong className="text-red-800 text-base">IMPORTANT :</strong>
            <div className="mt-1 font-semibold text-red-700">Veuillez régler le montant dû dans les plus brefs délais — sans régularisation, l'élève risque de ne pas être accepté dans l'école.</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Montant total dû</div>
            <div className="text-2xl font-bold text-red-700">{totalDue.toLocaleString('fr-FR')} FCFA</div>
          </div>
        </div>

        <div className="mt-4 text-sm text-right text-gray-600">
          {(() => {
            try {
              // Trouver la prochaine échéance impayée (dans les 12 prochains jours)
              // pour donner la date limite de paiement
              const today = new Date();
              const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const LEAD_DAYS = 12;
              
              // Filtrer les échéances futures dans les 12 prochains jours
              const prochaines = echeances
                .filter((e: any) => {
                  if (!e.date) return false;
                  const echeanceDate = new Date(e.date);
                  const joursRestants = Math.ceil((echeanceDate.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
                  return joursRestants > 0 && joursRestants <= LEAD_DAYS;
                })
                .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

              if (prochaines.length > 0) {
                // Prendre la première échéance future (la plus proche)
                const prochaineEcheance = new Date(prochaines[0].date);
                const formatted = prochaineEcheance.toLocaleDateString('fr-FR', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                });
                const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
                return (
                  <div className="print-deadline">
                    <div className="text-sm text-gray-700">Date limite de paiement :</div>
                    <div className="font-bold text-red-800">{capitalized}</div>
                  </div>
                );
              } else {
                // Aucune échéance future proche, afficher "Dès que possible"
                return (
                  <div className="print-deadline">
                    <div className="text-sm text-gray-700">Date limite de paiement :</div>
                    <div className="font-bold text-red-800">Dès que possible</div>
                  </div>
                );
              }
            } catch (_e) {
              return null;
            }
          })()}
        </div>

        <div className="mt-8 text-sm">
          <div className="flex justify-between">
            <div>
              <div className="font-medium">Signature responsable</div>
              <div className="mt-6 border-t w-48"></div>
            </div>
            <div className="text-right text-xs text-gray-500">
              Pour toute information : contactez l'administration
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
