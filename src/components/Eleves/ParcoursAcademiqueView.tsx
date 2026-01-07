import React, { useEffect, useState } from 'react';
import { ParcoursAcademique } from '../../types';
import { db } from '../../utils/database';
import { GraduationCap, Award, AlertCircle, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

interface ParcoursAcademiqueViewProps {
  eleveId: string;
}

export default function ParcoursAcademiqueView({ eleveId }: ParcoursAcademiqueViewProps) {
  const [parcours, setParcours] = useState<ParcoursAcademique[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadParcours();
  }, [eleveId]);

  const loadParcours = () => {
    setLoading(true);
    try {
      const data = db.getParcoursAcademique(eleveId);
      setParcours(data);
    } catch (error) {
      console.error('Erreur lors du chargement du parcours académique:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case 'Admis':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'Redoublant':
        return <TrendingDown className="w-5 h-5 text-orange-600" />;
      case 'Transféré':
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
      case 'En cours':
        return <GraduationCap className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatutBadge = (statut: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-sm font-medium";
    switch (statut) {
      case 'Admis':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'Redoublant':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case 'Transféré':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'En cours':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'Abandonné':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (parcours.length === 0) {
    return (
      <div className="text-center py-12">
        <GraduationCap className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun historique académique</h3>
        <p className="text-gray-500">
          Le parcours académique de cet élève sera enregistré à partir du prochain passage d'année.
        </p>
      </div>
    );
  }

  // Calculate statistics
  const totalYears = parcours.length;
  const admis = parcours.filter(p => p.statut === 'Admis').length;
  const redoublements = parcours.filter(p => p.statut === 'Redoublant').length;
  const moyenneGlobale = parcours
    .filter(p => p.moyenneAnnuelle !== undefined && p.moyenneAnnuelle !== null)
    .reduce((sum, p) => sum + (p.moyenneAnnuelle || 0), 0) / 
    parcours.filter(p => p.moyenneAnnuelle !== undefined && p.moyenneAnnuelle !== null).length || 0;

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Années au total</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{totalYears}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Admissions</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{admis}</p>
            </div>
            <Award className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Redoublements</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">{redoublements}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Moyenne globale</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {moyenneGlobale > 0 ? moyenneGlobale.toFixed(2) : 'N/A'}
              </p>
            </div>
            <GraduationCap className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Parcours Académique</h3>
          <p className="text-sm text-gray-500 mt-1">Historique détaillé année par année</p>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {parcours.map((p, index) => (
              <div key={p.id} className="relative">
                {/* Timeline connector */}
                {index < parcours.length - 1 && (
                  <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200"></div>
                )}

                <div className="flex gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shadow-sm">
                      {getStatutIcon(p.statut)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {p.niveau} {p.section && `- ${p.section}`}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Année scolaire: <span className="font-medium">{p.anneeScolaire}</span>
                        </p>
                      </div>
                      <span className={getStatutBadge(p.statut)}>
                        {p.statut}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {p.moyenneAnnuelle !== undefined && p.moyenneAnnuelle !== null && (
                        <div>
                          <p className="text-gray-500">Moyenne annuelle</p>
                          <p className="font-semibold text-gray-900 mt-1">
                            {p.moyenneAnnuelle.toFixed(2)}/20
                          </p>
                        </div>
                      )}
                      
                      {p.rang && p.effectifClasse && (
                        <div>
                          <p className="text-gray-500">Rang</p>
                          <p className="font-semibold text-gray-900 mt-1">
                            {p.rang}/{p.effectifClasse}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="text-gray-500">Début</p>
                        <p className="font-semibold text-gray-900 mt-1">
                          {new Date(p.dateDebut).toLocaleDateString('fr-FR')}
                        </p>
                      </div>

                      {p.dateFin && (
                        <div>
                          <p className="text-gray-500">Fin</p>
                          <p className="font-semibold text-gray-900 mt-1">
                            {new Date(p.dateFin).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      )}
                    </div>

                    {p.observations && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Observations:</span> {p.observations}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
