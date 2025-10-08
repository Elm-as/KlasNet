import React, { useState, useEffect } from 'react';
import { useToast } from '../Layout/ToastProvider';
import { Save, X, Upload, User, Calendar, MapPin, Phone, Mail, GraduationCap } from 'lucide-react';
import { db } from '../../utils/database';
import { Enseignant } from '../../types';

interface EnseignantFormProps {
  enseignant?: Enseignant | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function EnseignantForm({ enseignant, onSave, onCancel }: EnseignantFormProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    nom: '',
    prenoms: '',
    sexe: 'M' as 'M' | 'F',
    telephone: '',
    adresse: '',
    specialite: '',
    diplome: '',
    dateEmbauche: '',
    statut: 'Actif' as 'Actif' | 'Inactif' | 'Congé',
    salaire: 0,
    photo: '',
    classesPrincipales: [] as string[],
    matieresEnseignees: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (enseignant) {
      setFormData({
        nom: enseignant.nom,
        prenoms: enseignant.prenoms,
        sexe: enseignant.sexe,
        telephone: enseignant.telephone,
        adresse: enseignant.adresse,
        specialite: enseignant.specialite,
        diplome: enseignant.diplome,
        dateEmbauche: enseignant.dateEmbauche,
        statut: enseignant.statut,
        salaire: enseignant.salaire,
        photo: enseignant.photo || '',
        classesPrincipales: enseignant.classesPrincipales || [],
        matieresEnseignees: enseignant.matieresEnseignees || []
      });
    }
  }, [enseignant]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nom.trim()) newErrors.nom = 'Le nom est obligatoire';
    if (!formData.prenoms.trim()) newErrors.prenoms = 'Les prénoms sont obligatoires';
    if (!formData.specialite.trim()) newErrors.specialite = 'La spécialité est obligatoire';
    if (!formData.diplome.trim()) newErrors.diplome = 'Le diplôme est obligatoire';
    if (!formData.dateEmbauche) newErrors.dateEmbauche = 'La date d\'embauche est obligatoire';
    if (formData.salaire < 0) newErrors.salaire = 'Le salaire doit être positif';

    const enseignants = db.getAll<Enseignant>('enseignants');
    const existingEnseignant = enseignants.find(e => 
      e.nom.toLowerCase() === formData.nom.toLowerCase() &&
      e.prenoms.toLowerCase() === formData.prenoms.toLowerCase() &&
      e.id !== enseignant?.id
    );
    if (existingEnseignant) {
      newErrors.nom = 'Un enseignant avec ce nom et ces prénoms existe déjà';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      if (enseignant) {
        db.update<Enseignant>('enseignants', enseignant.id, formData);
        showToast('Enseignant mis à jour avec succès', 'success');
      } else {
        db.create<Enseignant>('enseignants', formData);
        showToast('Enseignant ajouté avec succès', 'success');
      }
      onSave();
    } catch {
      showToast("Erreur lors de la sauvegarde de l'enseignant", 'error');
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({ ...prev, photo: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* En-tête moderne */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white bg-opacity-20 p-4 rounded-xl">
                <User className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {enseignant ? "Modifier l'enseignant" : 'Nouvel enseignant'}
                </h1>
                <p className="text-blue-100 mt-1">
                  {enseignant ? "Modifiez les informations de l'enseignant" : 'Ajoutez un nouvel enseignant'}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-white hover:bg-white hover:bg-opacity-20 p-3 rounded-xl transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Section photo et informations de base */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="bg-blue-100 p-2 rounded-lg mr-3">👤</span>
              Informations personnelles
            </h3>
            
            <div className="flex items-start space-x-8">
              <div className="flex-shrink-0">
                <div className="w-32 h-32 bg-white rounded-2xl border-4 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group hover:border-blue-400 transition-colors">
                  {formData.photo ? (
                    <img 
                      src={formData.photo} 
                      alt="Photo enseignant"
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="text-center">
                      <User className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Photo enseignant</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <button
                  type="button"
                  className="mt-3 w-full flex items-center justify-center px-3 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Changer photo
                </button>
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => handleInputChange('nom', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all ${
                      errors.nom ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                    placeholder="Nom de famille"
                  />
                  {errors.nom && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.nom}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Prénoms <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.prenoms}
                    onChange={(e) => handleInputChange('prenoms', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all ${
                      errors.prenoms ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                    placeholder="Prénoms"
                  />
                  {errors.prenoms && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.prenoms}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Sexe <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.sexe === 'M' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="sexe"
                        value="M"
                        checked={formData.sexe === 'M'}
                        onChange={(e) => handleInputChange('sexe', e.target.value)}
                        className="sr-only"
                      />
                      <span className="font-medium">👨 Masculin</span>
                    </label>
                    <label className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.sexe === 'F' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="sexe"
                        value="F"
                        checked={formData.sexe === 'F'}
                        onChange={(e) => handleInputChange('sexe', e.target.value)}
                        className="sr-only"
                      />
                      <span className="font-medium">👩 Féminin</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Téléphone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.telephone}
                      onChange={(e) => handleInputChange('telephone', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                      placeholder="+225 XX XX XX XX XX"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Informations professionnelles */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="bg-green-100 p-2 rounded-lg mr-3">🎓</span>
              Informations professionnelles
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Spécialité <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.specialite}
                    onChange={(e) => handleInputChange('specialite', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all ${
                      errors.specialite ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                    placeholder="Ex: Instituteur, Professeur des écoles..."
                  />
                </div>
                {errors.specialite && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.specialite}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Diplôme <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.diplome}
                  onChange={(e) => handleInputChange('diplome', e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all ${
                    errors.diplome ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                  }`}
                  placeholder="Ex: CEAP, Licence, Master..."
                />
                {errors.diplome && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.diplome}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Date d'embauche <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.dateEmbauche}
                    onChange={(e) => handleInputChange('dateEmbauche', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all ${
                      errors.dateEmbauche ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                </div>
                {errors.dateEmbauche && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.dateEmbauche}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Salaire (FCFA)
                </label>
                <input
                  type="number"
                  value={formData.salaire}
                  onChange={(e) => handleInputChange('salaire', parseInt(e.target.value))}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all ${
                    errors.salaire ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                  }`}
                  min="0"
                  placeholder="150000"
                />
                {errors.salaire && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.salaire}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Statut
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'Actif', label: '✅ Actif', color: 'green' },
                    { value: 'Inactif', label: '⏸️ Inactif', color: 'gray' },
                    { value: 'Congé', label: '🏖️ En congé', color: 'orange' }
                  ].map(statut => (
                    <label key={statut.value} className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.statut === statut.value 
                        ? `border-${statut.color}-500 bg-${statut.color}-50 text-${statut.color}-700` 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="statut"
                        value={statut.value}
                        checked={formData.statut === statut.value}
                        onChange={(e) => handleInputChange('statut', e.target.value)}
                        className="sr-only"
                      />
                      <span className="font-medium text-sm">{statut.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Informations de contact */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="bg-yellow-100 p-2 rounded-lg mr-3">📞</span>
              Informations de contact
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Adresse
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <textarea
                    value={formData.adresse}
                    onChange={(e) => handleInputChange('adresse', e.target.value)}
                    rows={3}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none"
                    placeholder="Adresse de résidence"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-8 py-4 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Save className="h-5 w-5" />
              )}
              <span className="font-semibold">
                {enseignant ? (isSaving ? 'Sauvegarde...' : "Mettre à jour l'enseignant") : (isSaving ? 'Sauvegarde...' : "Enregistrer l'enseignant")}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}