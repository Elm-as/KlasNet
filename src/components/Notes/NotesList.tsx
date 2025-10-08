import React, { useState, useEffect } from 'react';
import { useToast } from '../Layout/ToastProvider';
import { Save, X } from 'lucide-react';
import { db } from '../../utils/database';
import { Matiere } from '../../types';

interface MatiereFormProps {
  matiere?: Matiere | null;
  onSave: (matiere: Matiere) => void;
  onCancel: () => void;
}

export default function MatiereForm({ matiere, onSave, onCancel }: MatiereFormProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    nom: '',
    coefficient: 1,
    type: 'Fondamentale' as 'Fondamentale' | 'Éveil' | 'Expression',
    obligatoire: true,
    classeIds: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (matiere) {
      setFormData({
        nom: matiere.nom,
        coefficient: matiere.coefficient,
        type: matiere.type,
        obligatoire: matiere.obligatoire,
        classeIds: matiere.classeIds || []
      });
    }
  }, [matiere]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nom.trim()) newErrors.nom = 'Le nom de la matière est obligatoire';
    if (formData.coefficient < 1 || formData.coefficient > 10) newErrors.coefficient = 'Le coefficient doit être entre 1 et 10';

    const matieres = db.getAll<Matiere>('matieres');
    const existingMatiere = matieres.find(m => 
      m.nom.toLowerCase() === formData.nom.toLowerCase() && 
      m.id !== matiere?.id
    );
    if (existingMatiere) {
      newErrors.nom = 'Une matière avec ce nom existe déjà';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      if (matiere) {
        const updatedMatiere = db.update<Matiere>('matieres', matiere.id, formData);
        if (updatedMatiere) {
          showToast('Matière mise à jour avec succès', 'success');
          onSave(updatedMatiere);
        }
      } else {
        const newMatiere = db.create<Matiere>('matieres', formData);
        showToast('Matière ajoutée avec succès', 'success');
        onSave(newMatiere);
      }
    } catch {
      showToast('Erreur lors de la sauvegarde de la matière', 'error');
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

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {matiere ? 'Modifier la matière' : 'Nouvelle matière'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {matiere ? 'Modifiez les informations de la matière' : 'Créez une nouvelle matière'}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de la matière <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => handleInputChange('nom', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                errors.nom ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Ex: Mathématiques, Français, Sciences..."
            />
            {errors.nom && <p className="mt-1 text-xs text-red-600">{errors.nom}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de matière <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="Fondamentale">Fondamentale</option>
                <option value="Éveil">Éveil</option>
                <option value="Expression">Expression</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {formData.type === 'Fondamentale' && 'Matières principales (Français, Maths...)'}
                {formData.type === 'Éveil' && 'Matières d\'éveil (Sciences, Histoire...)'}
                {formData.type === 'Expression' && 'Matières d\'expression (Arts, Sport...)'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coefficient <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.coefficient}
                onChange={(e) => handleInputChange('coefficient', parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                  errors.coefficient ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                min="1"
                max="10"
              />
              {errors.coefficient && <p className="mt-1 text-xs text-red-600">{errors.coefficient}</p>}
              <p className="mt-1 text-xs text-gray-500">
                Poids de la matière dans le calcul de la moyenne (1-10)
              </p>
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.obligatoire}
                onChange={(e) => handleInputChange('obligatoire', e.target.checked)}
                className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Matière obligatoire
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500 ml-7">
              Les matières obligatoires doivent être enseignées dans toutes les classes du niveau correspondant
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Coefficients recommandés</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium text-blue-800">Fondamentales</p>
                <p className="text-blue-700">Français: 4, Maths: 4</p>
              </div>
              <div>
                <p className="font-medium text-blue-800">Éveil</p>
                <p className="text-blue-700">Sciences: 2, Histoire-Géo: 2</p>
              </div>
              <div>
                <p className="font-medium text-blue-800">Expression</p>
                <p className="text-blue-700">Arts: 1, Sport: 1</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
              disabled={isSaving}
              aria-busy={isSaving}
              aria-label={matiere ? 'Mettre à jour la matière' : 'Créer la matière'}
            >
              {isSaving ? (
                <svg className="animate-spin h-4 w-4 mr-2 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{matiere ? (isSaving ? 'Sauvegarde...' : 'Mettre à jour') : (isSaving ? 'Sauvegarde...' : 'Créer la matière')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}