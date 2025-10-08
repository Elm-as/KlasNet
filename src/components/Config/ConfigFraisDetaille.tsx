// React import not required with automatic JSX runtime
import { useState, useEffect } from 'react';
import { db } from '../../utils/database';
import { FraisScolaire } from '../../types';
import { useToast } from '../Layout/ToastProvider';
import { Save, Plus, Edit2, Trash2, DollarSign, Calendar } from 'lucide-react';
import { initializeDefaultFrais } from '../../utils/defaultFraisScolaires';

const NIVEAUX = [
  'Petite Section', 'Moyenne Section', 'Grande Section',
  'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'
];

export default function ConfigFraisDetaille() {
  const { showToast } = useToast();
  const [fraisList, setFraisList] = useState<FraisScolaire[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    niveau: 'CP1',
    anneeScolaire: '2025-2026',
    echeances: [
      { date: '2025-09-01', montant: 35000, modalite: 1, label: 'Inscription' }
    ]
  });

  useEffect(() => {
    loadFrais();
    // Initialiser les frais par défaut si aucun n'existe
    const frais = db.getAll<FraisScolaire>('fraisScolaires');
    if (frais.length === 0) {
      initializeDefaultFrais();
      loadFrais();
    }
  }, []);

  const loadFrais = () => {
    const frais = db.getAll<FraisScolaire>('fraisScolaires');
    setFraisList(frais);
  };

  const resetForm = () => {
    setFormData({
      niveau: 'CP1',
      anneeScolaire: '2025-2026',
      echeances: [
        { date: '2025-09-01', montant: 35000, modalite: 1, label: 'Inscription' }
      ]
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (frais: FraisScolaire) => {
    setFormData({
      niveau: frais.niveau,
      anneeScolaire: frais.anneeScolaire,
      echeances: (frais.echeances || []).map(e => ({
        date: e.date,
        montant: e.montant,
        modalite: e.modalite || 1,
        label: e.label || ''
      }))
    });
    setEditingId(frais.id);
    setShowForm(true);
  };

  const handleDelete = (frais: FraisScolaire) => {
    if (window.confirm(`Supprimer les frais pour ${frais.niveau} (${frais.anneeScolaire}) ?`)) {
      db.delete('fraisScolaires', frais.id);
      loadFrais();
      showToast('Frais supprimés', 'success');
    }
  };

  const handleSave = () => {
    const totalMontant = formData.echeances.reduce((sum, e) => sum + e.montant, 0);
    
    const payload = {
      niveau: formData.niveau,
      anneeScolaire: formData.anneeScolaire,
      fraisInscription: 0,
      montant: totalMontant,
      echeances: formData.echeances.map((e, idx) => ({
        id: `${formData.niveau}-${formData.anneeScolaire}-${idx + 1}`,
        date: e.date,
        montant: e.montant,
        modalite: e.modalite,
        label: e.label
      }))
    };

    if (editingId) {
  db.update('fraisScolaires', editingId, payload as any);
      showToast('Frais mis à jour', 'success');
    } else {
      const exists = fraisList.find(f => f.niveau === formData.niveau && f.anneeScolaire === formData.anneeScolaire);
      if (exists) {
        showToast('Des frais existent déjà pour ce niveau et cette année', 'error');
        return;
      }
  db.create('fraisScolaires', payload as any);
      showToast('Frais ajoutés', 'success');
    }
    
    loadFrais();
    resetForm();
  };

  const addEcheance = () => {
    setFormData(prev => ({
      ...prev,
      echeances: [...prev.echeances, { date: '', montant: 10000, modalite: prev.echeances.length + 1, label: `Versement ${prev.echeances.length}` }]
    }));
  };

  const updateEcheance = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      echeances: prev.echeances.map((e, i) => 
        i === index ? { ...e, [field]: field === 'montant' || field === 'modalite' ? Number(value) : value } : e
      )
    }));
  };

  const removeEcheance = (index: number) => {
    setFormData(prev => ({
      ...prev,
      echeances: prev.echeances.filter((_, i) => i !== index)
    }));
  };

  const getTotalMontant = (frais: FraisScolaire) => {
    return (frais.echeances || []).reduce((sum, e) => sum + (e.montant || 0), 0);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-8 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 p-4 rounded-xl">
              <DollarSign className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Configuration des Frais Scolaires</h1>
              <p className="text-green-100 mt-2">Gestion des modalités de paiement par niveau</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl transition-all"
          >
            <Plus className="h-5 w-5" />
            <span className="font-semibold">Nouveau Frais</span>
          </button>
        </div>
      </div>

      {/* Liste des frais */}
      <div className="grid grid-cols-1 gap-6">
        {NIVEAUX.map(niveau => {
          const fraisNiveau = fraisList.filter(f => f.niveau === niveau);
          return (
            <div key={niveau} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{niveau}</h3>
                <p className="text-gray-600 text-sm">{fraisNiveau.length} configuration(s)</p>
              </div>
              
              <div className="p-6">
                {fraisNiveau.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Aucun frais configuré pour ce niveau</p>
                    <button
                      onClick={() => {
                        setFormData(prev => ({ ...prev, niveau }));
                        setShowForm(true);
                      }}
                      className="mt-3 text-teal-600 hover:text-teal-700 font-medium"
                    >
                      Configurer les frais
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fraisNiveau.map(frais => (
                      <div key={frais.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-semibold text-gray-900">{frais.anneeScolaire}</h4>
                            <p className="text-2xl font-bold text-green-600">
                              {getTotalMontant(frais).toLocaleString('fr-FR')} FCFA
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(frais)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(frais)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {(frais.echeances || []).map((echeance, idx) => (
                            <div key={idx} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-gray-600">
                                  Modalité {echeance.modalite}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(echeance.date).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 font-medium">{echeance.label || `Modalité ${echeance.modalite}`}</p>
                              <p className="font-bold text-gray-900">
                                {(echeance.montant || 0).toLocaleString('fr-FR')} FCFA
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de formulaire */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-6">
              <h3 className="text-xl font-bold">
                {editingId ? 'Modifier les frais' : 'Nouveau frais scolaire'}
              </h3>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Niveau</label>
                  <select
                    value={formData.niveau}
                    onChange={(e) => setFormData(prev => ({ ...prev, niveau: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all"
                  >
                    {NIVEAUX.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Année scolaire</label>
                  <input
                    type="text"
                    value={formData.anneeScolaire}
                    onChange={(e) => setFormData(prev => ({ ...prev, anneeScolaire: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all"
                    placeholder="2025-2026"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">Échéances de paiement</h4>
                  <div className="text-sm text-gray-600">
                    Total: {formData.echeances.reduce((sum, e) => sum + e.montant, 0).toLocaleString('fr-FR')} FCFA
                  </div>
                  <button
                    onClick={addEcheance}
                    className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Ajouter</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.echeances.map((echeance, index) => (
                    <div key={index} className="bg-white rounded-xl p-4 border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Modalité</label>
                          <input
                            type="number"
                            min="1"
                            value={echeance.modalite}
                            onChange={(e) => updateEcheance(index, 'modalite', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-center font-bold"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
                          <input
                            type="text"
                            value={echeance.label}
                            onChange={(e) => updateEcheance(index, 'label', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-medium"
                            placeholder="Ex: Inscription, Versement 1..."
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Date d'échéance</label>
                          <input
                            type="date"
                            value={echeance.date}
                            onChange={(e) => updateEcheance(index, 'date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Montant (FCFA)</label>
                          <input
                            type="number"
                            min="0"
                            value={echeance.montant}
                            onChange={(e) => updateEcheance(index, 'montant', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-right font-bold text-green-700"
                          />
                        </div>
                        
                        <div>
                          <button
                            onClick={() => removeEcheance(index)}
                            className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            disabled={formData.echeances.length === 1}
                          >
                            <Trash2 className="h-4 w-4 mx-auto" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-900 font-semibold">Total des frais:</span>
                    <span className="text-2xl font-bold text-blue-700">
                      {formData.echeances.reduce((sum, e) => sum + e.montant, 0).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-blue-600">
                    {formData.echeances.length} modalité(s) de paiement configurée(s)
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  onClick={resetForm}
                  className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl hover:from-green-700 hover:to-teal-700 transition-all"
                >
                  <Save className="h-5 w-5" />
                  <span>{editingId ? 'Mettre à jour' : 'Enregistrer'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}