import React, { useState, useEffect } from 'react';
import { db } from '../../utils/database';
import { CompositionConfig, Ecole } from '../../types';
import { useToast } from '../Layout/ToastProvider';
import { Save, Plus, Edit2, Trash2, BookOpen, X, GraduationCap } from 'lucide-react';

const NIVEAUX = [
  'Petite Section', 'Moyenne Section', 'Grande Section',
  'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'
];

export default function ConfigCompositions() {
  const { showToast } = useToast();
  const [compositions, setCompositions] = useState<CompositionConfig[]>([]);
  const [editing, setEditing] = useState<CompositionConfig | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    nom: '',
    coefficient: 1,
    niveau: '', // vide = toutes les classes
    ordre: 1
  });

  useEffect(() => {
    loadCompositions();
  }, []);

  const loadCompositions = () => {
    const comps = db.getAll<CompositionConfig>('compositions');
    setCompositions(comps.sort((a, b) => a.ordre - b.ordre));
  };

  const resetForm = () => {
    setFormData({ nom: '', coefficient: 1, niveau: '', ordre: 1 });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (comp: CompositionConfig) => {
    setFormData({ 
      nom: comp.nom, 
      coefficient: comp.coefficient,
      niveau: comp.niveau || '',
      ordre: comp.ordre
    });
    setEditing(comp);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formData.nom.trim()) {
      showToast('Le nom est obligatoire', 'error');
      return;
    }

    if (compositions.some(c => 
      c.nom.toLowerCase() === formData.nom.trim().toLowerCase() && 
      c.niveau === (formData.niveau || undefined) &&
      c.id !== editing?.id
    )) {
      showToast('Cette composition existe déjà pour ce niveau', 'error');
      return;
    }

    const compositionData = {
      nom: formData.nom.trim(),
      coefficient: formData.coefficient,
      niveau: formData.niveau || undefined,
      ordre: formData.ordre
    };

    if (editing) {
  db.update('compositions', editing.id, compositionData as any);
      showToast('Composition mise à jour', 'success');
    } else {
  db.create('compositions', compositionData as any);
      showToast('Composition ajoutée', 'success');
    }
    
    loadCompositions();
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Supprimer cette composition ? Toutes les notes associées seront perdues.')) {
      // Supprimer les notes associées
      const notes = db.getAll('notes').filter((n: any) => n.compositionId === id);
      notes.forEach((n: any) => db.delete('notes', n.id));
      
      // Supprimer les moyennes associées
      const moyennes = db.getAll('moyennesGenerales').filter((m: any) => m.compositionId === id);
      moyennes.forEach((m: any) => db.delete('moyennesGenerales', m.id));
      
      // Supprimer la composition
      db.delete('compositions', id);
      
      loadCompositions();
      showToast('Composition supprimée', 'success');
    }
  };

  const getCompositionsParNiveau = (niveau: string) => {
    return compositions.filter(c => !c.niveau || c.niveau === niveau);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-8 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 p-4 rounded-xl">
              <BookOpen className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Configuration des Compositions</h1>
              <p className="text-purple-100 mt-2">Gestion des périodes d'évaluation par niveau</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl transition-all"
          >
            <Plus className="h-5 w-5" />
            <span className="font-semibold">Nouvelle Composition</span>
          </button>
        </div>
      </div>

      {/* Vue par niveau */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {NIVEAUX.map(niveau => (
          <div key={niveau} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{niveau}</h3>
              <p className="text-gray-600 text-sm">
                {getCompositionsParNiveau(niveau).length} composition(s)
              </p>
            </div>
            
            <div className="p-6">
              {getCompositionsParNiveau(niveau).length === 0 ? (
                <div className="text-center py-8">
                  <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-3">Aucune composition spécifique</p>
                  <p className="text-xs text-gray-400">
                    Les compositions générales s'appliquent à ce niveau
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getCompositionsParNiveau(niveau).map(comp => (
                    <div key={comp.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <h4 className="font-semibold text-gray-900">{comp.nom}</h4>
                        <p className="text-sm text-gray-600">
                          Coefficient: {comp.coefficient} • Ordre: {comp.ordre}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(comp)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(comp.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Compositions générales */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-50 to-blue-50 px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Compositions Générales</h3>
          <p className="text-gray-600 text-sm">S'appliquent à tous les niveaux sauf configuration spécifique</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {compositions.filter(c => !c.niveau).map(comp => (
              <div key={comp.id} className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{comp.nom}</h4>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEdit(comp)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(comp.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {comp.coefficient}
                  </div>
                  <p className="text-gray-600 text-xs">Coefficient</p>
                  <p className="text-gray-500 text-xs mt-1">Ordre: {comp.ordre}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de formulaire */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">
                  {editing ? 'Modifier la composition' : 'Nouvelle composition'}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Nom de la composition <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all"
                  placeholder="Ex: 1ère Composition, Devoir de Noël..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Coefficient <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.coefficient}
                    onChange={(e) => setFormData(prev => ({ ...prev, coefficient: Number(e.target.value) }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Ordre d'affichage
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.ordre}
                    onChange={(e) => setFormData(prev => ({ ...prev, ordre: Number(e.target.value) }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Niveau spécifique (optionnel)
                </label>
                <select
                  value={formData.niveau}
                  onChange={(e) => setFormData(prev => ({ ...prev, niveau: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all"
                >
                  <option value="">Tous les niveaux</option>
                  {NIVEAUX.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Laissez vide pour appliquer à tous les niveaux
                </p>
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
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all"
                >
                  <Save className="h-5 w-5" />
                  <span>{editing ? 'Mettre à jour' : 'Enregistrer'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}