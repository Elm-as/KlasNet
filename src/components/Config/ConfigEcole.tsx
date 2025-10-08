import React, { useState, useEffect } from 'react';
import { db } from '../../utils/database';
import { Ecole } from '../../types';
import { useToast } from '../Layout/ToastProvider';
import { Save, Building2, Upload, X } from 'lucide-react';
import { getAllEnteteConfig, saveEnteteConfig } from '../../utils/entetesConfig';
import { licenceManager } from '../../utils/licenceManager';

export default function ConfigEcole() {
  const { showToast } = useToast();
  const [ecole, setEcole] = useState<Ecole | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    codeEtablissement: '',
    adresse: '',
    telephone: '',
    email: '',
    logo: '',
    devise: 'FCFA',
    anneeScolaireActive: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ nom?: string; codeEtablissement?: string }>(() => ({}));

  useEffect(() => {
    const ecoleData = db.getAll<Ecole>('ecole')[0];
    if (ecoleData) {
      setEcole(ecoleData);
      setFormData({
        nom: ecoleData.nom || '',
        codeEtablissement: ecoleData.codeEtablissement || '',
        adresse: ecoleData.adresse || '',
        telephone: ecoleData.telephone || '',
        email: ecoleData.email || '',
        logo: ecoleData.logo || '',
        devise: ecoleData.devise || 'FCFA',
        anneeScolaireActive: ecoleData.anneeScolaireActive || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)
      });
    }
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({ ...prev, logo: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    // client-side validation
    const newErrors: typeof errors = {};
    if (!formData.nom || formData.nom.trim().length < 3) newErrors.nom = 'Entrez le nom complet de l\'établissement (min. 3 caractères).';
    if (!formData.codeEtablissement || formData.codeEtablissement.trim().length < 2) newErrors.codeEtablissement = 'Entrez un code établissement valide.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      try { showToast('Veuillez corriger les erreurs du formulaire', 'error'); } catch (e) { /* ignore */ }
      return;
    }

    setIsSaving(true);
    try {
      if (ecole) {
        const updated = db.update<Ecole>('ecole', ecole.id, formData as any);
        if (updated) {
          setEcole(updated);
            showToast('Configuration de l\'école mise à jour', 'success');
          // Sync with entete config for print headers
          try {
            const all = getAllEnteteConfig();
            if (all.eleves) {
              all.eleves.etablissement = formData.nom || all.eleves.etablissement;
              all.eleves.logo = formData.logo || all.eleves.logo;
            }
            if (all.recu) {
              all.recu.etablissement = formData.nom || (all.recu as any).etablissement || '';
              all.recu.logo = formData.logo || all.recu.logo;
            }
            saveEnteteConfig(all);
          } catch (_e) { /* no-op */ }
        }
      } else {
        const newEcole = db.create<Ecole>('ecole', formData as any);
        setEcole(newEcole);
          showToast('Configuration de l\'école créée', 'success');
        try {
          window.dispatchEvent(new CustomEvent('ecole:created', { detail: { ecole: newEcole } }));
        } catch (e) { /* ignore */ }
        try {
          (licenceManager as any).createTrialLicence && (licenceManager as any).createTrialLicence();
        } catch (e) { /* ignore */ }
        try {
          const all = getAllEnteteConfig();
          if (all.eleves) {
            all.eleves.etablissement = formData.nom || all.eleves.etablissement;
            all.eleves.logo = formData.logo || all.eleves.logo;
          }
          if (all.recu) {
            all.recu.etablissement = formData.nom || (all.recu as any).etablissement || '';
            all.recu.logo = formData.logo || all.recu.logo;
          }
          saveEnteteConfig(all);
        } catch (_e) { /* no-op */ }
      }
    } catch (error) {
      showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* En-tête */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Building2 className="h-6 w-6 text-gray-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuration de l'École</h1>
            <p className="text-gray-600 mt-1">Paramètres généraux et informations de l'établissement</p>
          </div>
        </div>
      </div>

      {/* Formulaire principal */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Informations de l'établissement</h2>
          <p className="text-gray-600 text-sm mt-1">Ces informations apparaîtront sur tous les documents imprimés</p>
        </div>

        <div className="p-6 space-y-8">
          {/* Logo et nom */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-3">Logo de l'école</label>
              <div className="relative">
                <div className="w-full h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group hover:border-gray-400 transition-colors">
                  {formData.logo ? (
                    <>
                      <img 
                        src={formData.logo} 
                        alt="Logo école"
                        className="w-full h-full object-contain"
                      />
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, logo: '' }))}
                        className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                      >
                        <X className="h-4 w-4 text-gray-600" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Cliquez pour ajouter un logo</p>
                      <p className="text-gray-400 text-xs mt-1">PNG, JPG jusqu'à 5MB</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom complet de l'établissement <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                  placeholder="Ex: École Primaire Excellence"
                />
                {errors.nom && <div className="text-sm text-red-600 mt-1">{errors.nom}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code établissement <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.codeEtablissement}
                  onChange={(e) => setFormData(prev => ({ ...prev, codeEtablissement: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                  placeholder="Ex: ECOLE001, EPE2025..."
                />
                {errors.codeEtablissement && <div className="text-sm text-red-600 mt-1">{errors.codeEtablissement}</div>}
                <p className="text-xs text-gray-500 mt-2">
                  Code unique d'identification de votre établissement
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Devise</label>
                  <select
                    value={formData.devise}
                    onChange={(e) => setFormData(prev => ({ ...prev, devise: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                  >
                    <option value="FCFA">FCFA</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Année scolaire active</label>
                  <input
                    type="text"
                    value={formData.anneeScolaireActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, anneeScolaireActive: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                    placeholder="2025-2026"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Coordonnées */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Coordonnées de contact
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                  placeholder="+225 XX XX XX XX XX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email (optionnel)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                  placeholder="contact@ecole.ci"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Adresse complète</label>
              <textarea
                value={formData.adresse}
                onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors resize-none"
                placeholder="Adresse complète de l'établissement"
              />
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Aperçu sur les documents</h3>
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-center">
                {formData.logo && (
                  <img src={formData.logo} alt="Logo" className="h-16 mx-auto mb-4" />
                )}
                <div className="space-y-2">
                  <h4 className="text-xl font-bold text-gray-900">{formData.nom || 'Nom de l\'école'}</h4>
                  <p className="text-sm text-gray-600">Code: {formData.codeEtablissement || 'CODE_ECOLE'}</p>
                  <p className="text-gray-600">{formData.adresse || 'Adresse de l\'école'}</p>
                  <p className="text-gray-600">
                    {formData.telephone || 'Téléphone'}
                    {formData.email && ` • ${formData.email}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={isSaving || Object.keys(errors).length > 0}
              className="flex items-center space-x-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 focus:ring-2 focus:ring-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Save className="h-5 w-5" />
              )}
              <span className="font-medium">
                {isSaving ? 'Sauvegarde...' : 'Enregistrer la configuration'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}