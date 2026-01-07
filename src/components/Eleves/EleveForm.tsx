import React, { useState, useEffect, useRef, useMemo } from 'react';
import useUnsavedWarning from '../../hooks/useUnsavedWarning';
import useAutoSave from '../../hooks/useAutoSave';
import DiscardModal from '../UI/DiscardModal';
import { useToast } from '../Layout/ToastProvider';
import { Save, X, Upload, User, Calendar, MapPin, Phone, Users } from 'lucide-react';
import { db } from '../../utils/database';
import { formatNomPrenoms } from '../../utils/formatName';
import { Eleve, Classe } from '../../types';
import ParcoursAcademiqueView from './ParcoursAcademiqueView';

interface EleveFormProps {
  eleve?: Eleve | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function EleveForm({ eleve, onSave, onCancel }: EleveFormProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    matricule: '',
    nom: '',
    prenoms: '',
    sexe: 'M' as 'M' | 'F',
    dateNaissance: '',
    lieuNaissance: '',
    classeId: '',
    anneeEntree: new Date().getFullYear().toString(),
    statut: 'Actif' as 'Actif' | 'Inactif' | 'Transféré',
    pereTuteur: '',
    mereTutrice: '',
    telephone: '',
    adresse: '',
    photo: '',
    protege: false,
    garantId: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const classes = db.getAll<Classe>('classes');
  const enseignants = db.getAll('enseignants');
  useEffect(() => {
    if (eleve) {
      const initial = {
        matricule: eleve.matricule,
        nom: eleve.nom,
        prenoms: eleve.prenoms,
        sexe: eleve.sexe,
        dateNaissance: eleve.dateNaissance,
        lieuNaissance: eleve.lieuNaissance,
        classeId: eleve.classeId,
        anneeEntree: eleve.anneeEntree,
        statut: eleve.statut,
        pereTuteur: eleve.pereTuteur,
        mereTutrice: eleve.mereTutrice,
        telephone: eleve.telephone,
        adresse: eleve.adresse,
        photo: eleve.photo || ''
          ,protege: (eleve as any).protege || false
          ,garantId: (eleve as any).garantId || ''
      };
      setFormData(initial);
      // store initial snapshot for dirty-check
      initialFormRef.current = initial;
      const enseignants = db.getAll('enseignants');
    } else {
      const gen = db.generateMatricule();
      const initial = { ...formData, matricule: gen };
      setFormData(initial);
      initialFormRef.current = initial;
    }
  }, [eleve]);

  // ref to keep the initial loaded form for dirty-check
  const initialFormRef = useRef<any>({});

  const isDirty = useMemo(() => {
    try {
      return JSON.stringify(initialFormRef.current || {}) !== JSON.stringify(formData || {});
    } catch (e) { return false; }
  }, [formData]);

  // use the controller so we can show a custom in-app modal for SPA navigation
  const controller = useUnsavedWarning(isDirty);

  // autosave
  const autosaveKey = eleve?.id ? `eleve:${eleve.id}` : `eleve:new`;
  const { load: loadDraft, clear: clearDraft } = useAutoSave<Record<string, unknown>>(autosaveKey, formData);

  // pending action when prompting (e.g. cancel)
  const pendingActionRef = useRef<{ type: 'cancel' } | null>(null);
  const [closeIntent, setCloseIntent] = useState(false);

  // load draft on mount (only once)
  useEffect(() => {
    try {
      const draft = loadDraft();
      if (draft) setFormData(prev => ({ ...prev, ...(draft as any) }));
    } catch (err) { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // handle modal confirm/cancel
  const handleDiscardConfirm = () => {
    try { clearDraft(); } catch (err) { /* ignore */ }
    // if controller provides allowNavigation (popstate), use it
    const winAny: any = window as any;
    try { winAny.__preventReDispatch = true; } catch (e) { /* ignore */ }
    try {
      if (controller && (controller as any).allowNavigation) {
        (controller as any).allowNavigation();
      } else {
        onCancel();
      }
    } finally {
      setTimeout(() => { try { winAny.__preventReDispatch = false; } catch (e) { /* ignore */ } }, 80);
    }
  };

  const handleDiscardCancel = () => {
    if (controller && controller.closePrompt) controller.closePrompt();
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

  if (!formData.nom.trim()) newErrors.nom = 'Le nom est obligatoire';
  if (!formData.prenoms.trim()) newErrors.prenoms = 'Les prénoms sont obligatoires';
  if (!formData.classeId) newErrors.classeId = 'La classe est obligatoire';

    // If protege, garantId should be provided
    if ((formData as any).protege && !(formData as any).garantId) {
      newErrors.garantId = 'Un garant (enseignant) est requis pour un élève protégé';
    }

    const eleves = db.getAll<Eleve>('eleves');
    if (formData.matricule && formData.matricule.trim()) {
      const existingEleve = eleves.find(e => e.matricule === formData.matricule && e.id !== eleve?.id);
      if (existingEleve) newErrors.matricule = 'Ce matricule existe déjà';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      if (eleve) {
        db.update<Eleve>('eleves', eleve.id, formData as any);
        showToast('Élève mis à jour avec succès', 'success');
      } else {
        db.create<Eleve>('eleves', formData as any);
        showToast('Élève ajouté avec succès', 'success');
      }
      try { clearDraft(); } catch (err) { /* ignore */ }
      onSave();
    } catch {
      showToast('Erreur lors de la sauvegarde de l\'élève', 'error');
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
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* En-tête moderne */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {eleve ? 'Modifier l\'élève' : 'Nouvel élève'}
              </h1>
              <p className="text-gray-600 mt-1">
                {eleve ? 'Modifiez les informations de l\'élève' : 'Ajoutez un nouvel élève'}
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
          {/* Section photo et informations de base */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Informations personnelles
            </h3>
            
            <div className="flex items-start space-x-8">
              <div className="flex-shrink-0">
                <div className="w-32 h-32 bg-white rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group hover:border-gray-400 transition-colors">
                  {formData.photo ? (
                    <img 
                      src={formData.photo} 
                      alt="Photo élève"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-center">
                      <User className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Photo élève</p>
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
                  className="mt-3 w-full flex items-center justify-center px-3 py-2 text-sm bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Changer photo
                </button>
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Matricule <span className="text-gray-400 text-sm">(optionnel)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.matricule}
                    onChange={(e) => handleInputChange('matricule', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-gray-500 transition-colors ${
                      errors.matricule ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-300 focus:border-gray-500'
                    }`}
                    placeholder="Généré automatiquement"
                  />
                  {errors.matricule && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.matricule}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => handleInputChange('nom', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-gray-500 transition-colors ${
                      errors.nom ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-300 focus:border-gray-500'
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
                    className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-gray-500 transition-colors ${
                      errors.prenoms ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-300 focus:border-gray-500'
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
                    <label className={`flex items-center justify-center p-3 border rounded-md cursor-pointer transition-all ${
                      formData.sexe === 'M' ? 'border-gray-900 bg-gray-50 text-gray-900' : 'border-gray-300 hover:border-gray-400'
                    }`}>
                      <input
                        type="radio"
                        name="sexe"
                        value="M"
                        checked={formData.sexe === 'M'}
                        onChange={(e) => handleInputChange('sexe', e.target.value)}
                        className="sr-only"
                      />
                      <span className="font-medium">👦 Masculin</span>
                    </label>
                    <label className={`flex items-center justify-center p-3 border rounded-md cursor-pointer transition-all ${
                      formData.sexe === 'F' ? 'border-gray-900 bg-gray-50 text-gray-900' : 'border-gray-300 hover:border-gray-400'
                    }`}>
                      <input
                        type="radio"
                        name="sexe"
                        value="F"
                        checked={formData.sexe === 'F'}
                        onChange={(e) => handleInputChange('sexe', e.target.value)}
                        className="sr-only"
                      />
                      <span className="font-medium">👧 Féminin</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Informations scolaires */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Informations scolaires
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Date de naissance <span className="text-gray-400 text-sm">(optionnel)</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.dateNaissance}
                    onChange={(e) => handleInputChange('dateNaissance', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-md focus:ring-2 focus:ring-gray-500 transition-colors ${
                      errors.dateNaissance ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-300 focus:border-gray-500'
                    }`}
                  />
                </div>
                {errors.dateNaissance && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.dateNaissance}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Lieu de naissance
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.lieuNaissance}
                    onChange={(e) => handleInputChange('lieuNaissance', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                    placeholder="Ville de naissance"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Classe <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.classeId}
                  onChange={(e) => handleInputChange('classeId', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-md focus:ring-2 focus:ring-gray-500 transition-colors ${
                    errors.classeId ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-300 focus:border-gray-500'
                  }`}
                >
                  <option value="">Sélectionner une classe</option>
                  {classes.map(classe => (
                    <option key={classe.id} value={classe.id}>
                      {classe.niveau} {classe.section} ({classe.anneeScolaire})
                    </option>
                  ))}
                </select>
                {errors.classeId && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.classeId}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Année d'entrée
                </label>
                <input
                  type="text"
                  value={formData.anneeEntree}
                  onChange={(e) => handleInputChange('anneeEntree', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                  placeholder="2025"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Statut
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'Actif', label: 'Actif' },
                    { value: 'Inactif', label: 'Inactif' },
                    { value: 'Transféré', label: 'Transféré' }
                  ].map(statut => (
                    <label key={statut.value} className={`flex items-center justify-center p-2 border rounded-md cursor-pointer transition-all ${
                      formData.statut === statut.value 
                        ? 'border-gray-900 bg-gray-50 text-gray-900' 
                        : 'border-gray-300 hover:border-gray-400'
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

          {/* Informations familiales */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Informations familiales
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Père / Tuteur
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.pereTuteur}
                    onChange={(e) => handleInputChange('pereTuteur', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                    placeholder="Nom du père ou tuteur"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Mère / Tutrice
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.mereTutrice}
                    onChange={(e) => handleInputChange('mereTutrice', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                    placeholder="Nom de la mère ou tutrice"
                  />
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
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                    placeholder="+225 XX XX XX XX XX"
                  />
                </div>
              </div>

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
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors resize-none"
                    placeholder="Adresse de résidence"
                  />
                </div>
              </div>
            </div>

          {/* Protegé */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Statut spécial</h3>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-3">
                <input type="checkbox" checked={formData.protege} onChange={e => handleInputChange('protege', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">Élève protégé (ne paie que l'inscription)</span>
              </label>
            </div>
            {formData.protege && (
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Garant (enseignant)</label>
                <select
                  value={(formData as any).garantId}
                  onChange={e => handleInputChange('garantId', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                >
                  <option value="">-- Aucun --</option>
                  {enseignants.map((ens: any) => (
                    <option key={ens.id} value={ens.id}>{formatNomPrenoms(ens)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          </div>

          {/* Parcours Académique - Show only for existing students */}
          {eleve && eleve.id && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Parcours Académique
              </h3>
              <ParcoursAcademiqueView eleveId={eleve.id} />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                if (!isDirty) return onCancel();
                // show modal via controller if available
                try {
                  pendingActionRef.current = { type: 'cancel' };
                  if (controller && controller.openPrompt) controller.openPrompt();
                } catch (err) {
                  // fallback to native confirm
                  if (window.confirm('Vous avez des modifications non sauvegardées. Quitter sans enregistrer ?')) {
                    try { clearDraft(); } catch (e) {}
                    onCancel();
                  }
                }
              }}
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
                {eleve ? (isSaving ? 'Sauvegarde...' : 'Mettre à jour l\'élève') : (isSaving ? 'Sauvegarde...' : 'Enregistrer l\'élève')}
              </span>
            </button>
          </div>
        </form>
      </div>
      {/* discard modal (router/popstate protection) */}
      {controller && (
        <DiscardModal
          open={Boolean((controller as any).showPrompt)}
          onConfirm={handleDiscardConfirm}
          onCancel={handleDiscardCancel}
        />
      )}
    </div>
  );
}

// Discard modal handling (rendered by controller)
// Render modal at the bottom so it overlays the form when needed
export function EleveFormWithModal(props: any) {
  return <EleveForm {...props} />;
}
