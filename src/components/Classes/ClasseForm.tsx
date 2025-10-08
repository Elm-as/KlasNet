import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { db } from '../../utils/database';
import { formatNomPrenoms } from '../../utils/formatName';
import { useToast } from '../Layout/ToastProvider';
import { Classe, Matiere, Enseignant } from '../../types';

interface ClasseFormProps {
  classe?: Classe | null;
  onSave: (classe: Classe) => void;
  onCancel: () => void;
}

export default function ClasseForm({ classe, onSave, onCancel }: ClasseFormProps) {
  // Accept any string for niveau because persisted values include sections like "Petite Section" etc.
  type Niveau = string;

  const [formData, setFormData] = useState({
    niveau: 'CP1' as Niveau,
    section: 'A',
    anneeScolaire: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
    enseignantPrincipal: '',
    effectifMax: 35,
    salle: ''
  });

  const { showToast } = useToast();
  const [selectedMatieres, setSelectedMatieres] = useState<Matiere[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const matieres = db.getAll<Matiere>('matieres');
  const enseignants = db.getAll<Enseignant>('enseignants');

  useEffect(() => {
    if (classe) {
      setFormData({
        niveau: classe.niveau,
        section: classe.section,
        anneeScolaire: classe.anneeScolaire,
        enseignantPrincipal: classe.enseignantPrincipal,
        effectifMax: classe.effectifMax,
        salle: classe.salle
      });
      setSelectedMatieres(classe.matieres);
    }
  }, [classe]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.niveau) newErrors.niveau = 'Le niveau est obligatoire';
    if (!formData.section.trim()) newErrors.section = 'La section est obligatoire';
    if (!formData.anneeScolaire.trim()) newErrors.anneeScolaire = 'L\'année scolaire est obligatoire';
    if (!formData.enseignantPrincipal.trim()) newErrors.enseignantPrincipal = 'L\'enseignant principal est obligatoire';
    if (formData.effectifMax < 1 || formData.effectifMax > 50) newErrors.effectifMax = 'L\'effectif maximum doit être entre 1 et 50';
    if (!formData.salle.trim()) newErrors.salle = 'La salle est obligatoire';
    if (selectedMatieres.length === 0) newErrors.matieres = 'Au moins une matière doit être sélectionnée';

    const classes = db.getAll<Classe>('classes');
    const existingClasse = classes.find(c => 
      c.niveau === formData.niveau && 
      c.section === formData.section && 
      c.anneeScolaire === formData.anneeScolaire &&
      c.id !== classe?.id
    );
    if (existingClasse) {
      newErrors.section = 'Cette classe existe déjà pour cette année scolaire';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const classeData = {
        ...formData,
        matieres: selectedMatieres,
        updatedAt: now,
        ...(classe ? {} : { createdAt: now })
      };
      if (classe) {
        const updatedClasse = db.update<Classe>('classes', classe.id, classeData);
        if (updatedClasse) {
          showToast('Classe mise à jour avec succès', 'success');
          onSave(updatedClasse);
        }
      } else {
        const newClasse = db.create<Classe>('classes', classeData);
        showToast('Classe ajoutée avec succès', 'success');
        onSave(newClasse);
      }
    } catch {
      showToast('Erreur lors de la sauvegarde de la classe', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleMatiereToggle = (matiere: Matiere) => {
    setSelectedMatieres(prev => {
      const exists = prev.find(m => m.id === matiere.id);
      if (exists) {
        return prev.filter(m => m.id !== matiere.id);
      } else {
        return [...prev, matiere];
      }
    });

    if (errors.matieres) {
      setErrors(prev => ({ ...prev, matieres: '' }));
    }
  };

  const getMatieresByType = (type: string) => {
    return matieres.filter(m => m.type === type);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* En-tête moderne */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {classe ? 'Modifier la classe' : 'Nouvelle classe'}
              </h1>
              <p className="text-gray-600 mt-1">
                {classe ? 'Modifiez les informations de la classe' : 'Créez une nouvelle classe'}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informations de base */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Informations de base
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Niveau <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.niveau}
                  onChange={(e) => handleInputChange('niveau', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-gray-500 transition-colors ${
                    errors.niveau ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-300 focus:border-gray-500'
                  }`}
                >
                  <option value="Petite Section">Petite Section</option>
                  <option value="Moyenne Section">Moyenne Section</option>
                  <option value="Grande Section">Grande Section</option>
                  <option value="CP1">CP1</option>
                  <option value="CP2">CP2</option>
                  <option value="CE1">CE1</option>
                  <option value="CE2">CE2</option>
                  <option value="CM1">CM1</option>
                  <option value="CM2">CM2</option>
                </select>
                {errors.niveau && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.niveau}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Section <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.section}
                  onChange={(e) => handleInputChange('section', e.target.value.toUpperCase())}
                  className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-gray-500 transition-colors ${
                    errors.section ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-300 focus:border-gray-500'
                  }`}
                  placeholder="A, B, C..."
                  maxLength={2}
                />
                {errors.section && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.section}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Année scolaire <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.anneeScolaire}
                  onChange={(e) => handleInputChange('anneeScolaire', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-gray-500 transition-colors ${
                    errors.anneeScolaire ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-300 focus:border-gray-500'
                  }`}
                  placeholder="2025-2026"
                />
                {errors.anneeScolaire && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.anneeScolaire}</p>}
              </div>
            </div>
          </div>

          {/* Gestion et organisation */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Gestion et organisation
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Enseignant principal <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.enseignantPrincipal}
                  onChange={(e) => handleInputChange('enseignantPrincipal', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-gray-500 transition-colors ${
                    errors.enseignantPrincipal ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-300 focus:border-gray-500'
                  }`}
                >
                  <option value="">Sélectionner un enseignant</option>
                  {enseignants.filter(e => e.statut === 'Actif').map(enseignant => (
                    <option key={enseignant.id} value={formatNomPrenoms(enseignant)}>
                      {formatNomPrenoms(enseignant)}
                    </option>
                  ))}
                </select>
                {errors.enseignantPrincipal && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.enseignantPrincipal}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Effectif maximum <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.effectifMax}
                  onChange={(e) => handleInputChange('effectifMax', parseInt(e.target.value))}
                  className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-gray-500 transition-colors ${
                    errors.effectifMax ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-300 focus:border-gray-500'
                  }`}
                  min="1"
                  max="50"
                />
                {errors.effectifMax && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.effectifMax}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Salle de classe <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.salle}
                  onChange={(e) => handleInputChange('salle', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-gray-500 transition-colors ${
                    errors.salle ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-300 focus:border-gray-500'
                  }`}
                  placeholder="Ex: Salle 1, Salle A..."
                />
                {errors.salle && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.salle}</p>}
              </div>
            </div>
          </div>

          {/* Matières enseignées */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Matières enseignées <span className="text-red-500">*</span>
            </h3>
            
            {errors.matieres && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 flex items-center">
                  <span className="mr-2">⚠️</span>
                  {errors.matieres}
                </p>
              </div>
            )}

            <div className="space-y-8">
              {['Fondamentale', 'Éveil', 'Expression'].map(type => (
                <div key={type} className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-3">{type}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getMatieresByType(type).map(matiere => {
                      const isSelected = selectedMatieres.find(m => m.id === matiere.id);
                      return (
                        <label
                          key={matiere.id}
                          className={`flex items-center p-3 border rounded-md cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-gray-900 bg-gray-50' 
                              : 'border-gray-300 hover:border-gray-400 bg-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={!!isSelected}
                            onChange={() => handleMatiereToggle(matiere)}
                            className="sr-only"
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{matiere.nom}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              Coefficient: {matiere.coefficient}
                              {matiere.obligatoire && (
                                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                                  Obligatoire
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center ml-3">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedMatieres.length} matière(s) sélectionnée(s)
                  </p>
                  <p className="text-gray-700 mt-1">
                    Coefficient total: {selectedMatieres.reduce((sum, m) => sum + m.coefficient, 0)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {selectedMatieres.length}
                  </div>
                  <p className="text-gray-600 text-sm">matières</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 focus:ring-2 focus:ring-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Save className="h-5 w-5" />
              )}
              <span className="font-medium">
                {classe ? (isSaving ? 'Sauvegarde...' : 'Mettre à jour la classe') : (isSaving ? 'Sauvegarde...' : 'Créer la classe')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}