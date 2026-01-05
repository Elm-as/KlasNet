import React, { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, Wrench, RefreshCw } from 'lucide-react';
import { db } from '../../utils/database';
import { Classe, Matiere, FraisScolaire, Eleve } from '../../types';
import { useToast } from '../Layout/ToastProvider';
import clsx from 'clsx';

interface IntegrityIssue {
  id: string;
  type: 'classe_sans_niveau' | 'matiere_non_liee' | 'montant_manquant' | 'eleve_sans_classe';
  severity: 'error' | 'warning';
  title: string;
  description: string;
  affectedItem: any;
  fixable: boolean;
}

/**
 * Composant pour détecter et corriger les problèmes d'intégrité des données
 * Identifie les classes sans niveau, matières non liées, montants manquants, etc.
 */
export default function DataIntegrityView() {
  const { showToast } = useToast();
  const [fixing, setFixing] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const issues = useMemo(() => {
    const foundIssues: IntegrityIssue[] = [];

    // 1. Détecter les classes sans niveau
    const classes = db.getAll<Classe>('classes');
    classes.forEach((classe) => {
      if (!classe.niveau || classe.niveau.trim() === '') {
        foundIssues.push({
          id: `classe_niveau_${classe.id}`,
          type: 'classe_sans_niveau',
          severity: 'error',
          title: `Classe "${classe.nom}" sans niveau`,
          description: `La classe ${classe.nom} (${classe.section}) n'a pas de niveau défini. Cela empêche la configuration des frais scolaires.`,
          affectedItem: classe,
          fixable: false, // Nécessite intervention manuelle
        });
      }
    });

    // 2. Détecter les élèves sans classe ou avec classe invalide
    const eleves = db.getAll<Eleve>('eleves');
    const classeIds = new Set(classes.map((c) => c.id));
    eleves.forEach((eleve) => {
      if (!eleve.classeId || !classeIds.has(eleve.classeId)) {
        foundIssues.push({
          id: `eleve_classe_${eleve.id}`,
          type: 'eleve_sans_classe',
          severity: 'error',
          title: `Élève "${eleve.nom} ${eleve.prenoms}" sans classe valide`,
          description: `L'élève n'est pas assigné à une classe existante. Matricule: ${eleve.matricule}`,
          affectedItem: eleve,
          fixable: false,
        });
      }
    });

    // 3. Détecter les niveaux sans configuration de frais
    const fraisScolaires = db.getAll<FraisScolaire>('fraisScolaires');
    const niveauxAvecFrais = new Set(fraisScolaires.map((f) => f.niveau));
    const niveauxClasses = new Set(classes.map((c) => c.niveau).filter(Boolean));

    niveauxClasses.forEach((niveau) => {
      if (!niveauxAvecFrais.has(niveau!)) {
        foundIssues.push({
          id: `frais_niveau_${niveau}`,
          type: 'montant_manquant',
          severity: 'warning',
          title: `Aucun frais configuré pour le niveau "${niveau}"`,
          description: `Le niveau ${niveau} n'a pas de configuration de frais scolaires. Les élèves de ce niveau ne pourront pas effectuer de paiements.`,
          affectedItem: { niveau },
          fixable: true,
        });
      }
    });

    // 4. Détecter les matières potentiellement orphelines
    const matieres = db.getAll<Matiere>('matieres');
    const matieresUtilisees = new Set<string>();
    classes.forEach((classe) => {
      if (classe.matieres && Array.isArray(classe.matieres)) {
        classe.matieres.forEach((m: any) => {
          const matiereId = typeof m === 'string' ? m : m?.id;
          if (matiereId) matieresUtilisees.add(matiereId);
        });
      }
    });

    matieres.forEach((matiere) => {
      if (!matieresUtilisees.has(matiere.id)) {
        foundIssues.push({
          id: `matiere_orpheline_${matiere.id}`,
          type: 'matiere_non_liee',
          severity: 'warning',
          title: `Matière "${matiere.nom}" non utilisée`,
          description: `La matière "${matiere.nom}" n'est assignée à aucune classe.`,
          affectedItem: matiere,
          fixable: false,
        });
      }
    });

    return foundIssues;
  }, [refreshKey]);

  const handleFix = async (issue: IntegrityIssue) => {
    setFixing(issue.id);
    try {
      switch (issue.type) {
        case 'montant_manquant': {
          // Créer une configuration de frais par défaut
          const niveau = issue.affectedItem.niveau;
          const nouveauFrais: FraisScolaire = {
            id: `frais_${Date.now()}`,
            niveau,
            anneeScolaire: new Date().getFullYear().toString(),
            inscription: 35000,
            scolarite: 90000,
            nombreVersements: 9,
            montantParVersement: 10000,
          };
          db.add('fraisScolaires', nouveauFrais);
          showToast(
            `Configuration de frais créée pour le niveau ${niveau}`,
            'success'
          );
          break;
        }
        default:
          showToast('Cette correction nécessite une intervention manuelle', 'info');
      }
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error('Erreur lors de la correction:', error);
      showToast('Erreur lors de la correction', 'error');
    } finally {
      setFixing(null);
    }
  };

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Intégrité des Données</h2>
            <p className="mt-1 text-sm text-gray-600">
              Vérification automatique des problèmes de cohérence des données
            </p>
          </div>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </button>
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-green-900">
                  {issues.length === 0 ? '✓' : `${issues.length} problèmes`}
                </div>
                <div className="text-sm text-green-700">
                  {issues.length === 0 ? 'Aucun problème détecté' : 'Problèmes trouvés'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-red-900">{errorCount}</div>
                <div className="text-sm text-red-700">Erreurs critiques</div>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <div className="text-2xl font-bold text-orange-900">{warningCount}</div>
                <div className="text-sm text-orange-700">Avertissements</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Issues List */}
      {issues.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Aucun problème détecté
          </h3>
          <p className="text-gray-600">
            Toutes les données sont cohérentes et correctement configurées.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className={clsx(
                'bg-white rounded-lg shadow-sm p-6 border-l-4',
                issue.severity === 'error' ? 'border-red-500' : 'border-orange-500'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start flex-1">
                  {issue.severity === 'error' ? (
                    <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-orange-600 mr-3 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{issue.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">{issue.description}</p>
                    {issue.fixable && (
                      <div className="mt-2 text-sm text-gray-500 flex items-center">
                        <Wrench className="w-4 h-4 mr-1" />
                        Correction automatique disponible
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  {issue.fixable ? (
                    <button
                      onClick={() => handleFix(issue)}
                      disabled={fixing === issue.id}
                      className={clsx(
                        'px-4 py-2 rounded-md text-sm font-medium',
                        fixing === issue.id
                          ? 'bg-gray-300 text-gray-600 cursor-wait'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      )}
                    >
                      {fixing === issue.id ? 'Correction...' : 'Corriger'}
                    </button>
                  ) : (
                    <span className="px-4 py-2 text-sm text-gray-500 italic">
                      Correction manuelle requise
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
