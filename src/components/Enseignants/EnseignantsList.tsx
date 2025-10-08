import { useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, User, Phone, Mail } from 'lucide-react';
import ModuleContainer from '../Layout/ModuleContainer';
import Button from '../UI/Button';
import { db } from '../../utils/database';
import { formatNomPrenoms } from '../../utils/formatName';
import { Enseignant, Classe } from '../../types';

interface EnseignantsListProps {
  onEnseignantSelect: (enseignant: Enseignant | null) => void;
  onNewEnseignant: () => void;
}

export default function EnseignantsList({ onEnseignantSelect, onNewEnseignant }: EnseignantsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  const enseignants = db.getAll<Enseignant>('enseignants');
  const classes = db.getAll<Classe>('classes');

  const filteredEnseignants = useMemo(() => {
    let filtered = [...enseignants];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(enseignant =>
    enseignant.nom.toLowerCase().includes(term) ||
    enseignant.prenoms.toLowerCase().includes(term) ||
    (enseignant.specialite || '').toLowerCase().includes(term) ||
    ((enseignant as any).email || '').toLowerCase().includes(term) ||
    formatNomPrenoms(enseignant).toLowerCase().includes(term)
        );
    }

    if (filterStatut) {
      filtered = filtered.filter(enseignant => enseignant.statut === filterStatut);
    }

    return filtered.sort((a, b) => a.nom.localeCompare(b.nom));
  }, [enseignants, searchTerm, filterStatut]);

  const handleDelete = (enseignant: Enseignant) => {
    // Vérifier si l'enseignant est assigné à des classes
    const classesAssignees = classes.filter(c => 
      c.enseignantPrincipal === `${enseignant.prenoms} ${enseignant.nom}`
    );

    if (classesAssignees.length > 0) {
      alert(`Impossible de supprimer cet enseignant car il est assigné à ${classesAssignees.length} classe(s).`);
      return;
    }

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'enseignant ${enseignant.prenoms} ${enseignant.nom} ?`)) {
      db.delete('enseignants', enseignant.id);
  // dataChanged dispatched by db methods
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'Actif': return 'bg-green-100 text-green-800';
      case 'Inactif': return 'bg-gray-100 text-gray-800';
      case 'Congé': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getClassesAssignees = (enseignantNom: string) => {
    return classes.filter(c => c.enseignantPrincipal === enseignantNom);
  };

  return (
    <ModuleContainer title="Gestion des Enseignants" subtitle={`${filteredEnseignants.length} enseignant(s) trouvé(s)`} actions={(
      <>
        <Button variant="primary" onClick={onNewEnseignant}><Plus className="h-4 w-4" /><span>Nouvel Enseignant</span></Button>
      </>
    )}>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un enseignant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="">Tous les statuts</option>
            <option value="Actif">Actif</option>
            <option value="Inactif">Inactif</option>
            <option value="Congé">En congé</option>
          </select>
        </div>
      </div>

      {/* Grille des enseignants */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEnseignants.map((enseignant) => {
        const classesAssignees = getClassesAssignees(formatNomPrenoms(enseignant));
          
          return (
            <div key={enseignant.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              {/* En-tête de la carte */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {enseignant.photo ? (
                    <img 
                      src={enseignant.photo} 
                      alt={formatNomPrenoms(enseignant)}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {formatNomPrenoms(enseignant)}
                    </h3>
                    <p className="text-sm text-gray-500">{enseignant.specialite}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEnseignantSelect(enseignant)}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                    title="Modifier"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(enseignant)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Statut */}
              <div className="mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatutColor(enseignant.statut)}`}>
                  {enseignant.statut}
                </span>
              </div>

              {/* Informations de contact */}
              <div className="space-y-2 mb-4">
                {enseignant.telephone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{enseignant.telephone}</span>
                  </div>
                )}
                {((enseignant as any).email) && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{(enseignant as any).email}</span>
                  </div>
                )}
              </div>

              {/* Diplôme */}
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Diplôme:</span> {enseignant.diplome}
                </p>
              </div>

              {/* Classes assignées */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Classes assignées ({classesAssignees.length})
                </p>
                {classesAssignees.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {classesAssignees.slice(0, 3).map((classe) => (
                      <span 
                        key={classe.id}
                        className="px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded"
                      >
                        {classe.niveau} {classe.section}
                      </span>
                    ))}
                    {classesAssignees.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        +{classesAssignees.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-gray-500">Aucune classe assignée</span>
                )}
              </div>

              {/* Date d'embauche */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Embauché le {new Date(enseignant.dateEmbauche).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {filteredEnseignants.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Aucun enseignant trouvé</p>
          <Button variant="primary" onClick={onNewEnseignant} className="mt-4">Ajouter votre premier enseignant</Button>
        </div>
      )}
    </ModuleContainer>
  );
}