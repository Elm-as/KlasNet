import { useMemo, useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Users, DollarSign, BookOpen, TrendingUp, XCircle, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { db } from '../../utils/database';
import { Eleve, Paiement, FraisScolaire, Classe, Note, Ecole, SituationFinanciere } from '../../types';

import { format } from 'date-fns';
import ParamEntetesModal from '../Config/ParamEntetesModal';
import ModuleContainer from '../Layout/ModuleContainer';
import { echeancesManager } from '../../utils/echeancesManager';

export default function Dashboard() {
  const [showParamEntetes, setShowParamEntetes] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Fonctions pour navigation rapide
  const handleNouvelEleve = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'eleves', action: 'new' } }));
  };
  const handleNouveauPaiement = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'finances' } }));
    window.dispatchEvent(new CustomEvent('open-payment-form'));
  };
  const handleSaisirNotes = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'notes' } }));
    window.dispatchEvent(new CustomEvent('open-notes-entry'));
  };

  const eleves = db.getAll<Eleve>('eleves');
  const paiements = db.getAll<Paiement>('paiements').filter(p => !p.canceled);
  const fraisScolaires = db.getAll<FraisScolaire>('fraisScolaires');
  const classes = db.getAll<Classe>('classes');
  const notes = db.getAll<Note>('notes');

  // Alertes d'échéances intelligentes
  const alertesEcheances = useMemo(() => echeancesManager.getAlertesEcheances(), [reloadKey]);

  // Alertes : élèves sans notes
  const elevesSansNotes = useMemo(() => eleves.filter(e => !notes.some(n => n.eleveId === e.id)), [eleves, notes, reloadKey]);

  const stats = useMemo(() => {
    const totalEleves = eleves.length;
    const elevesActifs = eleves.filter(e => e.statut === 'Actif').length;

    const totalRecettes = paiements.reduce((sum, p) => sum + p.montant, 0);
    const recettesMoisCourant = paiements
      .filter(p => {
        const paiementDate = new Date(p.datePaiement);
        const now = new Date();
        return paiementDate.getMonth() === now.getMonth() && paiementDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, p) => sum + p.montant, 0);

    // Calcul des situations financières via echeancesManager (respecte les règles des protégés)
    const situationsFinancieres = eleves.map(eleve => {
      const situation = echeancesManager.getSituationEcheances(eleve.id);
      if (!situation) return { eleveId: eleve.id, statut: 'Non Payé' as SituationFinanciere['statut'], solde: 0 };
      // If protege, compute inscription-only sums
      if (situation.eleve && situation.eleve.protege) {
        const ins = (situation.echeances || []).filter((e: any) => e.modalite === 1);
        const totalDuIns = ins.reduce((sum: number, e: any) => sum + (e.montant || 0), 0);
        const totalPayeIns = ins.reduce((sum: number, e: any) => sum + (e.montantPaye || 0), 0);
        let statut: SituationFinanciere['statut'] = 'Non Payé';
        if (totalDuIns > 0 && totalPayeIns >= totalDuIns) statut = 'Payé';
        else if (totalPayeIns > 0) statut = 'Partiellement Payé';
        return { eleveId: eleve.id, statut, solde: totalDuIns - totalPayeIns };
      }
      const totalDu = situation.totalDu || 0;
      const totalPaye = situation.totalPaye || 0;
      let statut: SituationFinanciere['statut'] = 'Non Payé';
      if (totalDu > 0 && totalPaye >= totalDu) statut = 'Payé';
      else if (totalPaye > 0) statut = 'Partiellement Payé';
      return { eleveId: eleve.id, statut, solde: totalDu - totalPaye };
    });

    const elevesParStatut = {
      soldes: situationsFinancieres.filter(s => s.statut === 'Payé').length,
      partiels: situationsFinancieres.filter(s => s.statut === 'Partiellement Payé').length,
      impayes: situationsFinancieres.filter(s => s.statut === 'Non Payé').length,
    };

    return { totalEleves, elevesActifs, totalRecettes, recettesMoisCourant, elevesParStatut };
  }, [eleves, paiements, fraisScolaires, classes, reloadKey]);

  const recettesParMois = useMemo(() => {
    const mois = Array.from({ length: 12 }, (_, i) => ({ mois: format(new Date(2024, i, 1), 'MMM'), recettes: 0 }));
    paiements.forEach(p => {
      const d = new Date(p.datePaiement);
      if (!isNaN(d.getTime())) {
        const idx = d.getMonth();
        if (idx >= 0 && idx < 12) mois[idx].recettes += p.montant;
      }
    });
    return mois;
  }, [paiements, reloadKey]);

  const repartitionPaiements = [
    { name: 'Payé', value: stats.elevesParStatut.soldes, color: '#10b981' },
    { name: 'Partiel', value: stats.elevesParStatut.partiels, color: '#f59e0b' },
    { name: 'Non Payé', value: stats.elevesParStatut.impayes, color: '#ef4444' },
  ];

  const formatMontant = (m: number) => new Intl.NumberFormat('fr-FR').format(m) + ' FCFA';

  const [ecole, setEcole] = useState<Ecole | null>(null);
  useEffect(() => setEcole(db.getAll<Ecole>('ecole')[0] || null), [reloadKey]);

  // Refresh dashboard when data changes elsewhere in the app
  useEffect(() => {
    const onDataChanged = () => setReloadKey(k => k + 1);
    window.addEventListener('dataChanged', onDataChanged as EventListener);
    return () => window.removeEventListener('dataChanged', onDataChanged as EventListener);
  }, []);

  return (
    <ModuleContainer
      title="Tableau de bord"
      subtitle={`Année scolaire ${ecole?.anneeScolaireActive || 'Non configurée'}`}
      actions={(
        <>
          <button onClick={handleNouvelEleve} className="px-3 py-2 bg-teal-600 text-white rounded-md">Nouvel élève</button>
          <button onClick={handleNouveauPaiement} className="px-3 py-2 bg-gray-900 text-white rounded-md">Paiement</button>
        </>
      )}
    >
      {/* Alertes */}
      {(elevesSansNotes.length > 0 || (alertesEcheances?.echeancesEchues?.length || 0) > 0 || (alertesEcheances?.echeancesProches?.length || 0) > 0) && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Alertes</h3>
              <div className="space-y-1 text-sm text-gray-700">
                {elevesSansNotes.length > 0 && <p>{elevesSansNotes.length} élève(s) n'ont aucune note enregistrée.</p>}
                {alertesEcheances?.echeancesEchues?.length > 0 && <p>{alertesEcheances.echeancesEchues.length} élève(s) ont des échéances échues.</p>}
                {alertesEcheances?.echeancesProches?.length > 0 && <p>{alertesEcheances.echeancesProches.length} échéance(s) dans les 7 prochains jours.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Élèves Actifs</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.elevesActifs}</p>
              <p className="text-sm text-gray-500 mt-1">Total: {stats.totalEleves}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recettes Totales</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatMontant(stats.totalRecettes)}</p>
              <p className="text-sm text-gray-500 mt-1 flex items-center"><TrendingUp className="inline h-3 w-3 mr-1" />Ce mois: {formatMontant(stats.recettesMoisCourant)}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Paiements Complétés</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.elevesParStatut.soldes}</p>
              <div className="flex items-center space-x-2 mt-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-500">Frais payés</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Non Payé</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.elevesParStatut.impayes}</p>
              <div className="flex items-center space-x-2 mt-1">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-gray-500">En attente</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <XCircle className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-gray-600" /> Évolution des Recettes</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={recettesParMois}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(value) => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(value)} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatMontant(Number(value))} />
              <Bar dataKey="recettes" fill="#374151" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><CheckCircle className="h-5 w-5 text-gray-600" /> Situation des Paiements</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={repartitionPaiements} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                {repartitionPaiements.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center space-x-6 mt-4">
            {repartitionPaiements.map(item => (
              <div key={item.name} className="flex items-center space-x-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} /> <span className="text-sm text-gray-600">{item.name} ({item.value})</span></div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Actions Rapides</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="group p-6 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all text-left" onClick={handleNouvelEleve}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors"><Users className="h-5 w-5 text-gray-600" /></div>
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Nouvel Élève</h4>
            <p className="text-sm text-gray-600">Inscrire un nouvel élève</p>
          </button>

          <button className="group p-6 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all text-left" onClick={handleNouveauPaiement}>
            <div className="flex items-center justify-between mb-3"><div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors"><DollarSign className="h-5 w-5 text-gray-600" /></div></div>
            <h4 className="font-semibold text-gray-900 mb-1">Nouveau Paiement</h4>
            <p className="text-sm text-gray-600">Enregistrer un paiement</p>
          </button>

          <button className="group p-6 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all text-left" onClick={handleSaisirNotes}>
            <div className="flex items-center justify-between mb-3"><div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors"><BookOpen className="h-5 w-5 text-gray-600" /></div></div>
            <h4 className="font-semibold text-gray-900 mb-1">Saisir Notes</h4>
            <p className="text-sm text-gray-600">Enregistrer les notes</p>
          </button>
        </div>
      </div>

      {showParamEntetes && <ParamEntetesModal onClose={() => setShowParamEntetes(false)} />}
    </ModuleContainer>
  );
}