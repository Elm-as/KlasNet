import { useState } from 'react';
import { db } from '../../utils/database';
import { Building2, DollarSign, BookOpen, FileText, Database, History, GraduationCap, Shield, ArrowLeft, Upload } from 'lucide-react';
import ConfigEcole from './ConfigEcole';
import ConfigFraisDetaille from './ConfigFraisDetaille';
import ConfigCompositions from './ConfigCompositions';
import ConfigImpression from './ConfigImpression';
import ConfigBackup from './ConfigBackup';
import HistoriqueList from './HistoriqueList';
import ConfigLicence from './ConfigLicence';
import ConfigPassageAnnee from './ConfigPassageAnnee';
import ConfigImportComplet from './ConfigImportComplet';

type ConfigSection = 'menu' | 'ecole' | 'frais' | 'compositions' | 'impression' | 'backup' | 'historique' | 'licence' | 'passage' | 'import';

const configSections = [
  {
    id: 'ecole' as ConfigSection,
    title: 'Configuration École',
    description: 'Nom, logo, coordonnées de l\'établissement',
    icon: Building2
  },
  {
    id: 'frais' as ConfigSection,
    title: 'Configuration Frais',
    description: 'Modalités et échéances de paiement par niveau',
    icon: DollarSign
  },
  {
    id: 'compositions' as ConfigSection,
    title: 'Configuration Compositions',
    description: 'Périodes d\'évaluation et coefficients',
    icon: BookOpen
  },
  {
    id: 'impression' as ConfigSection,
    title: 'Configuration Impression',
    description: 'Entêtes, logos et mise en page des documents',
    icon: FileText
  },
  {
    id: 'import' as ConfigSection,
    title: 'Importation Complète',
    description: 'Importer élèves, classes et paiements depuis Excel',
    icon: Upload
  },
  {
    id: 'backup' as ConfigSection,
    title: 'Sauvegarde & Restauration',
    description: 'Export, import et gestion des données',
    icon: Database
  },
  {
    id: 'historique' as ConfigSection,
    title: 'Historique des Actions',
    description: 'Journal des modifications et opérations',
    icon: History
  },
  {
    id: 'licence' as ConfigSection,
    title: 'Gestion des Licences',
    description: 'Activation et statut de la licence logicielle',
    icon: Shield
  },
  {
    id: 'passage' as ConfigSection,
    title: 'Passage d\'année scolaire',
    description: 'Clôturer l\'année en cours et préparer la nouvelle',
    icon: GraduationCap
  }
];

export default function ConfigMain() {
  const [currentSection, setCurrentSection] = useState<ConfigSection>('menu');

  const renderContent = () => {
    switch (currentSection) {
      case 'ecole':
        return <ConfigEcole />;
      case 'frais':
        return <ConfigFraisDetaille />;
      case 'compositions':
        return <ConfigCompositions />;
      case 'impression':
        return <ConfigImpression />;
      case 'import':
        return <ConfigImportComplet />;
      case 'backup':
        return <ConfigBackup />;
      case 'historique':
        return <HistoriqueList />;
      case 'licence':
        return <ConfigLicence />;
      case 'passage':
        return <ConfigPassageAnnee />;
      default:
        return (
          <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
              {/* En-tête principal */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Configuration Système</h1>
                  <p className="text-gray-600 mt-2">Paramètres généraux de votre école</p>
                </div>
              </div>

              {/* Grille des sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {configSections.map((section) => {
                  const IconComponent = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setCurrentSection(section.id)}
                      className="group bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition-all text-left"
                    >
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gray-200 transition-colors">
                        <IconComponent className="h-6 w-6 text-gray-600" />
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {section.title}
                      </h3>
                      
                      <p className="text-gray-600 text-sm mb-4">
                        {section.description}
                      </p>
                      
                      <div className="flex items-center text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                        <span>Configurer</span>
                        <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Informations système */}
              <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Informations Système</h3>
                  <p className="text-gray-600">État actuel de votre configuration</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {db.getAll('eleves').length}
                    </div>
                    <p className="text-gray-600 font-medium">Élèves</p>
                  </div>
                  
                  <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {db.getAll('classes').length}
                    </div>
                    <p className="text-gray-600 font-medium">Classes</p>
                  </div>
                  
                  <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {db.getAll('matieres').length}
                    </div>
                    <p className="text-gray-600 font-medium">Matières</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  if (currentSection !== 'menu') {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="p-6">
          {/* Breadcrumb */}
          <div className="mb-6">
            <button
              onClick={() => setCurrentSection('menu')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour à la configuration</span>
            </button>
          </div>
          
          {renderContent()}
        </div>
      </div>
    );
  }

  return (
    <div>
      {renderContent()}
    </div>
  );
}