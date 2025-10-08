import React, { useState, useEffect } from 'react';
import { Shield, Key, AlertTriangle, Clock, CheckCircle, Settings } from 'lucide-react';
import { licenceManager } from '../../utils/licenceManager';
import { db } from '../../utils/database';
import ConfigEcole from '../Config/ConfigEcole';

interface LicenceGuardProps {
  children: React.ReactNode;
}

export default function LicenceGuard({ children }: LicenceGuardProps) {
  const [licenceStatus, setLicenceStatus] = useState<any>(null);
  const [showActivation, setShowActivation] = useState(false);
  const [activationKey, setActivationKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationMessage, setActivationMessage] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    checkLicence();

    const interval = setInterval(checkLicence, 60 * 60 * 1000);

    const onEcoleCreated = () => {
      setShowConfig(false);
      checkLicence();
    };
    window.addEventListener('ecole:created', onEcoleCreated as EventListener);

    return () => {
      clearInterval(interval);
      window.removeEventListener('ecole:created', onEcoleCreated as EventListener);
    };
  }, []);

  const checkLicence = async () => {
    await licenceManager.updateLicenceFromServer();
    const status = await licenceManager.checkLicenceStatus();
    setLicenceStatus(status);
  };

  const handleActivation = () => {
    if (!activationKey.trim()) {
      setActivationMessage('Veuillez entrer une clé de licence');
      return;
    }

    setIsActivating(true);
    
    try {
      const result = licenceManager.activateLicence(activationKey.trim());
      
      if (result.success) {
        setActivationMessage(result.message);
        setActivationKey('');
        setTimeout(() => {
          setShowActivation(false);
          checkLicence();
        }, 2000);
      } else {
        setActivationMessage(result.message);
      }
    } catch (error) {
      setActivationMessage('Erreur lors de l\'activation de la licence');
    } finally {
      setIsActivating(false);
    }
  };

  // Si la licence n'est pas encore vérifiée
  if (!licenceStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Vérification de la licence</h2>
            <p className="text-gray-600">Veuillez patienter...</p>
          </div>
        </div>
      </div>
    );
  }

  // Si la licence est valide, afficher l'application
  if (licenceStatus.isValid && !licenceStatus.isExpired) {
    return (
      <>
        {children}
        {/* Notification discrète pour les licences qui expirent bientôt */}
        {licenceStatus.daysRemaining <= 7 && (
          <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-semibold text-gray-900">Licence expire bientôt</p>
                <p className="text-sm text-gray-600">Plus que {licenceStatus.daysRemaining} jour(s)</p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // If user chose to configure, show the ConfigEcole screen
  if (showConfig) return <ConfigEcole />;

  // Interface de blocage pour licence expirée/invalide
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-gray-200 max-w-lg w-full">
        {/* En-tête */}
        <div className="p-8 text-center border-b border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-gray-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Licence Expirée</h1>
          <p className="text-gray-600">Votre licence KlasNet a expiré</p>
        </div>

        {/* Contenu */}
        <div className="p-8 space-y-6">
          {/* Informations sur la licence */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-gray-900">Statut de la licence</h3>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium text-gray-900 capitalize">{licenceStatus.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expiration:</span>
                <span className="font-medium text-gray-900">
                  {licenceStatus.dateExpiration ? 
                    new Date(licenceStatus.dateExpiration).toLocaleDateString('fr-FR') : 
                    'Non définie'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Jours restants:</span>
                <span className="font-bold text-red-600">{licenceStatus.daysRemaining}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => setShowConfig(true)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Settings className="h-5 w-5" />
              <span>Configurer l'application</span>
            </button>

            <button
              onClick={() => setShowActivation(!showActivation)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Key className="h-5 w-5" />
              <span>Activer une nouvelle licence</span>
            </button>
          </div>

          {/* Activation de licence */}
          {showActivation && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">Activation manuelle</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clé de licence
                  </label>
                  <textarea
                    value={activationKey}
                    onChange={(e) => setActivationKey(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors resize-none font-mono text-sm"
                    rows={4}
                    placeholder="Collez votre clé de licence ici..."
                  />
                </div>

                {activationMessage && (
                  <div className={`p-4 rounded-lg ${
                    activationMessage.includes('succès') 
                      ? 'bg-green-50 text-green-800 border border-green-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    <div className="flex items-center space-x-2">
                      {activationMessage.includes('succès') ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5" />
                      )}
                      <span className="text-sm">{activationMessage}</span>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowActivation(false);
                      setActivationKey('');
                      setActivationMessage('');
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleActivation}
                    disabled={isActivating || !activationKey.trim()}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {isActivating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Key className="h-4 w-4" />
                    )}
                    <span>{isActivating ? 'Activation...' : 'Activer'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Informations de contact */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">Besoin d'une licence ?</h4>
            <div className="text-sm text-gray-700 space-y-2">
              <p>📞 <strong>Téléphone:</strong> +2250555863953</p>
              <p>📧 <strong>Email:</strong> Non disponible</p>
              <p>🌐 <strong>Site web:</strong> Non disponible</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-200">
          <p className="text-xs text-gray-500">
            © 2025 KlasNet - Logiciel de Gestion Scolaire
          </p>
        </div>
      </div>
    </div>
  );
}