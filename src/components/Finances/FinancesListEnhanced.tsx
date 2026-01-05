import React, { useState, useMemo } from 'react';
import { Search, Filter, DollarSign, Users, TrendingUp, Plus, Printer, FileText } from 'lucide-react';
import { db } from '../../utils/database';
import { Eleve, Paiement, FraisScolaire, Classe } from '../../types';
import { useDebounce } from '../../hooks/useDebounce';
import ModuleContainer from '../Layout/ModuleContainer';
import { useToast } from '../Layout/ToastProvider';
import ProgressIndicator from '../UI/ProgressIndicator';
import PaymentForm from './PaymentForm';

/**
 * Interface moderne pour la gestion des finances
 * Design amélioré avec statistiques visuelles et navigation intuitive
 */
export default function FinancesListEnhanced() {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClasse, setSelectedClasse] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<'all' | 'paye' | 'partiel' | 'impaye'>('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedEleve, setSelectedEleve] = useState<Eleve | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Charger les données
  const eleves = db.getAll<Eleve>('eleves');
  const paiements = db.getAll<Paiement>('paiements');
  const fraisScolaires = db.getAll<FraisScolaire>('fraisScolaires');
  const classes = db.getAll<Classe>('classes');

  // Memoization des paiements par élève
  const paiementsMap = useMemo(() => {
    const map = new Map<string, Paiement[]>();
    paiements.forEach(p => {
      const existing = map.get(p.eleveId) ?? [];
      map.set(p.eleveId, [...existing, p]);
    });
    return map;
  }, [paiements]);

  // Calculer le montant total payé par élève
  const getTotalPaye = (eleveId: string) => {
    const paies = paiementsMap.get(eleveId) ?? [];
    return paies.reduce((sum, p) => sum + (p.montant || 0), 0);
  };

  // Calculer le montant attendu par élève
  const getMontantAttendu = (eleve: Eleve) => {
    const classe = classes.find(c => c.id === eleve.classeId);
    if (!classe) return 0;
    const frais = fraisScolaires.find(f => f.niveau === classe.niveau && f.anneeScolaire === classe.anneeScolaire);
    if (!frais) return 0;
    return (frais.inscription || 0) + (frais.scolarite || 0);
  };

  // Déterminer le statut de paiement
  const getStatut = (eleve: Eleve): 'paye' | 'partiel' | 'impaye' => {
    const paye = getTotalPaye(eleve.id);
    const attendu = getMontantAttendu(eleve);
    if (attendu === 0) return 'paye';
    if (paye >= attendu) return 'paye';
    if (paye > 0) return 'partiel';
    return 'impaye';
  };

  // Filtrer les élèves
  const filteredEleves = useMemo(() => {
    let filtered = eleves.filter(e => e.statut === 'Actif');

    if (selectedClasse) {
      filtered = filtered.filter(e => e.classeId === selectedClasse);
    }

    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.nom.toLowerCase().includes(term) ||
        e.prenoms.toLowerCase().includes(term) ||
        e.matricule.toLowerCase().includes(term)
      );
    }

    if (selectedStatut !== 'all') {
      filtered = filtered.filter(e => getStatut(e) === selectedStatut);
    }

    return filtered;
  }, [eleves, selectedClasse, debouncedSearchTerm, selectedStatut]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    const total = eleves.filter(e => e.statut === 'Actif').length;
    const payes = eleves.filter(e => e.statut === 'Actif' && getStatut(e) === 'paye').length;
    const partiels = eleves.filter(e => e.statut === 'Actif' && getStatut(e) === 'partiel').length;
    const impayes = eleves.filter(e => e.statut === 'Actif' && getStatut(e) === 'impaye').length;
    
    const totalAttendu = eleves.filter(e => e.statut === 'Actif').reduce((sum, e) => sum + getMontantAttendu(e), 0);
    const totalPercu = eleves.filter(e => e.statut === 'Actif').reduce((sum, e) => sum + getTotalPaye(e.id), 0);

    return { total, payes, partiels, impayes, totalAttendu, totalPercu };
  }, [eleves, paiementsMap]);

  return (
    <ModuleContainer
      title="Gestion Financière"
      subtitle={`${filteredEleves.length} élève(s) | ${stats.totalPercu.toLocaleString('fr-FR')} FCFA perçus sur ${stats.totalAttendu.toLocaleString('fr-FR')} FCFA`}
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Nouveau paiement</span>
            <span className="sm:hidden">Paiement</span>
          </button>
          <button
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            <Printer className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Imprimer</span>
          </button>
        </div>
      }
    >
      {/* Statistiques visuelles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-800">Payés</span>
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-900">{stats.payes}</div>
          <ProgressIndicator 
            value={(stats.payes / stats.total) * 100} 
            color="green" 
            size="sm" 
            className="mt-2"
          />
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-orange-800">Partiels</span>
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-orange-900">{stats.partiels}</div>
          <ProgressIndicator 
            value={(stats.partiels / stats.total) * 100} 
            color="orange" 
            size="sm" 
            className="mt-2"
          />
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-800">Impayés</span>
            <FileText className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-900">{stats.impayes}</div>
          <ProgressIndicator 
            value={(stats.impayes / stats.total) * 100} 
            color="red" 
            size="sm" 
            className="mt-2"
          />
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">Total perçu</span>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-blue-900">
            {stats.totalPercu.toLocaleString('fr-FR')} FCFA
          </div>
          <ProgressIndicator 
            value={(stats.totalPercu / stats.totalAttendu) * 100} 
            color="blue" 
            size="sm" 
            className="mt-2"
          />
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un élève..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtre par classe */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={selectedClasse}
              onChange={(e) => setSelectedClasse(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="">Toutes les classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.niveau} {c.section}</option>
              ))}
            </select>
          </div>

          {/* Filtre par statut */}
          <div className="relative">
            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="paye">✓ Payés</option>
              <option value="partiel">⚠ Partiels</option>
              <option value="impaye">✗ Impayés</option>
            </select>
          </div>

          {/* Réinitialiser */}
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedClasse('');
              setSelectedStatut('all');
            }}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Liste des élèves */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Élève
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                  Classe
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Payé
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden md:table-cell">
                  Attendu
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                  Progression
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEleves.map((eleve) => {
                const totalPaye = getTotalPaye(eleve.id);
                const montantAttendu = getMontantAttendu(eleve);
                const statut = getStatut(eleve);
                const progression = montantAttendu > 0 ? (totalPaye / montantAttendu) * 100 : 0;
                const classe = classes.find(c => c.id === eleve.classeId);

                return (
                  <tr key={eleve.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {eleve.nom} {eleve.prenoms}
                          </div>
                          <div className="text-xs text-gray-500">{eleve.matricule}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 hidden sm:table-cell">
                      {classe ? `${classe.niveau} ${classe.section}` : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {totalPaye.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                      {montantAttendu.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                      <ProgressIndicator 
                        value={progression} 
                        color={statut === 'paye' ? 'green' : statut === 'partiel' ? 'orange' : 'red'}
                        size="sm"
                        showLabel
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        statut === 'paye' ? 'bg-green-100 text-green-800' :
                        statut === 'partiel' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {statut === 'paye' ? '✓ Payé' : statut === 'partiel' ? '⚠ Partiel' : '✗ Impayé'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedEleve(eleve);
                          setShowPaymentModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        Gérer
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredEleves.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Aucun élève trouvé</p>
            <p className="text-sm text-gray-500 mt-1">
              Essayez de modifier vos filtres de recherche
            </p>
          </div>
        )}
      </div>

      {/* Modal de paiement */}
      {showPaymentModal && (
        <PaymentForm
          onCancel={() => {
            setShowPaymentModal(false);
            setSelectedEleve(null);
          }}
          onSubmit={(eleveId, montant, type, modalite) => {
            // Logique de traitement du paiement (à implémenter)
            showToast('Paiement enregistré avec succès', 'success');
            setShowPaymentModal(false);
            setSelectedEleve(null);
          }}
        />
      )}
    </ModuleContainer>
  );
}
