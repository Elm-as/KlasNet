import React, { useState, useMemo } from 'react';
import { db } from '../../utils/database';
import { Eleve, Paiement, FraisScolaire, Classe } from '../../types';
import { 
  Download, 
  Printer, 
  FileText, 
  TrendingUp, 
  Users, 
  DollarSign,
  Filter,
  Search,
  Calendar,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ModuleContainer from '../Layout/ModuleContainer';
import { useDebounce } from '../../hooks/useDebounce';

interface RecouvrementStats {
  totalEleves: number;
  elevesPayes: number;
  elevesPartiels: number;
  elevesImpayes: number;
  montantAttendu: number;
  montantPercu: number;
  tauxRecouvrement: number;
}

interface EleveRecouvrement {
  eleve: Eleve;
  classe: Classe | null;
  montantAttendu: number;
  montantPaye: number;
  montantRestant: number;
  pourcentagePaye: number;
  statut: 'Payé' | 'Partiel' | 'Impayé';
  paiements: Paiement[];
  dernierPaiement: Paiement | null;
}

export default function FichesRecouvrement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClasse, setSelectedClasse] = useState<string>('all');
  const [selectedStatut, setSelectedStatut] = useState<string>('all');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [sortBy, setSortBy] = useState<'nom' | 'montantPaye' | 'montantRestant' | 'classe'>('nom');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Récupération des données
  const eleves = db.getAll<Eleve>('eleves').filter(e => e.statut === 'Actif');
  const paiements = db.getAll<Paiement>('paiements');
  const fraisScolaires = db.getAll<FraisScolaire>('fraisScolaires');
  const classes = db.getAll<Classe>('classes');

  // Map des frais par niveau pour accès O(1)
  const fraisMap = useMemo(() => {
    const map = new Map<string, FraisScolaire>();
    fraisScolaires.forEach(frais => {
      map.set(frais.niveau, frais);
    });
    return map;
  }, [fraisScolaires]);

  // Map des paiements par élève pour accès O(1)
  const paiementsMap = useMemo(() => {
    const map = new Map<string, Paiement[]>();
    paiements.forEach(p => {
      const existing = map.get(p.eleveId) ?? [];
      map.set(p.eleveId, [...existing, p]);
    });
    return map;
  }, [paiements]);

  // Calcul des données de recouvrement par élève
  const elevesRecouvrement = useMemo((): EleveRecouvrement[] => {
    return eleves.map(eleve => {
      const classe = classes.find(c => c.id === eleve.classeId) || null;
      const frais = classe ? fraisMap.get(classe.niveau) : null;
      
      // Calcul du montant attendu
      let montantAttendu = 0;
      if (frais) {
        if (eleve.protege) {
          montantAttendu = frais.inscription || 0;
        } else {
          montantAttendu = (frais.inscription || 0) + 
                          (frais.scolariteComplete || 0);
        }
      }

      // Calcul du montant payé
      const paiementsEleve = paiementsMap.get(eleve.id) ?? [];
      
      // Filtrage par date si nécessaire
      let paiementsFiltres = paiementsEleve;
      if (dateDebut || dateFin) {
        paiementsFiltres = paiementsEleve.filter(p => {
          const datePaiement = new Date(p.datePaiement);
          const debut = dateDebut ? new Date(dateDebut) : new Date('1900-01-01');
          const fin = dateFin ? new Date(dateFin) : new Date('2100-12-31');
          return datePaiement >= debut && datePaiement <= fin;
        });
      }

      const montantPaye = paiementsFiltres.reduce((sum, p) => sum + p.montant, 0);
      const montantRestant = Math.max(0, montantAttendu - montantPaye);
      const pourcentagePaye = montantAttendu > 0 ? (montantPaye / montantAttendu) * 100 : 0;

      let statut: 'Payé' | 'Partiel' | 'Impayé' = 'Impayé';
      if (pourcentagePaye >= 100) {
        statut = 'Payé';
      } else if (pourcentagePaye > 0) {
        statut = 'Partiel';
      }

      const dernierPaiement = paiementsFiltres.length > 0
        ? paiementsFiltres.sort((a, b) => new Date(b.datePaiement).getTime() - new Date(a.datePaiement).getTime())[0]
        : null;

      return {
        eleve,
        classe,
        montantAttendu,
        montantPaye,
        montantRestant,
        pourcentagePaye,
        statut,
        paiements: paiementsFiltres,
        dernierPaiement
      };
    });
  }, [eleves, classes, fraisMap, paiementsMap, dateDebut, dateFin]);

  // Filtrage et tri
  const elevesFiltered = useMemo(() => {
    let filtered = elevesRecouvrement;

    // Filtre par recherche
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(er => 
        er.eleve.nom.toLowerCase().includes(searchLower) ||
        er.eleve.prenoms.toLowerCase().includes(searchLower) ||
        er.eleve.matricule.toLowerCase().includes(searchLower) ||
        (er.classe?.niveau + ' ' + er.classe?.section)?.toLowerCase().includes(searchLower)
      );
    }

    // Filtre par classe
    if (selectedClasse !== 'all') {
      filtered = filtered.filter(er => er.eleve.classeId === selectedClasse);
    }

    // Filtre par statut
    if (selectedStatut !== 'all') {
      filtered = filtered.filter(er => er.statut === selectedStatut);
    }

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'nom':
          comparison = a.eleve.nom.localeCompare(b.eleve.nom);
          break;
        case 'montantPaye':
          comparison = a.montantPaye - b.montantPaye;
          break;
        case 'montantRestant':
          comparison = a.montantRestant - b.montantRestant;
          break;
        case 'classe':
          const classeA = a.classe ? `${a.classe.niveau} ${a.classe.section}` : '';
          const classeB = b.classe ? `${b.classe.niveau} ${b.classe.section}` : '';
          comparison = classeA.localeCompare(classeB);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [elevesRecouvrement, debouncedSearchTerm, selectedClasse, selectedStatut, sortBy, sortOrder]);

  // Calcul des statistiques globales
  const stats = useMemo((): RecouvrementStats => {
    const totalEleves = elevesFiltered.length;
    const elevesPayes = elevesFiltered.filter(er => er.statut === 'Payé').length;
    const elevesPartiels = elevesFiltered.filter(er => er.statut === 'Partiel').length;
    const elevesImpayes = elevesFiltered.filter(er => er.statut === 'Impayé').length;
    
    const montantAttendu = elevesFiltered.reduce((sum, er) => sum + er.montantAttendu, 0);
    const montantPercu = elevesFiltered.reduce((sum, er) => sum + er.montantPaye, 0);
    const tauxRecouvrement = montantAttendu > 0 ? (montantPercu / montantAttendu) * 100 : 0;

    return {
      totalEleves,
      elevesPayes,
      elevesPartiels,
      elevesImpayes,
      montantAttendu,
      montantPercu,
      tauxRecouvrement
    };
  }, [elevesFiltered]);

  // Fonction d'impression
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const ecole = db.getAll('ecole')[0];
    const dateGeneration = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fiche de Recouvrement - ${dateGeneration}</title>
          <style>
            @media print {
              @page { margin: 1cm; size: A4 landscape; }
            }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 10pt;
              margin: 0;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
            }
            .header h1 { margin: 5px 0; font-size: 18pt; }
            .header h2 { margin: 5px 0; font-size: 14pt; color: #666; }
            .header p { margin: 3px 0; font-size: 9pt; }
            .stats {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 20px;
            }
            .stat-card {
              border: 1px solid #ddd;
              padding: 10px;
              border-radius: 4px;
              text-align: center;
            }
            .stat-card .label { font-size: 9pt; color: #666; margin-bottom: 5px; }
            .stat-card .value { font-size: 14pt; font-weight: bold; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 6px;
              text-align: left;
              font-size: 9pt;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .status-paye { color: #10b981; font-weight: bold; }
            .status-partiel { color: #f59e0b; font-weight: bold; }
            .status-impaye { color: #ef4444; font-weight: bold; }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 8pt;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${ecole?.nom || 'École'}</h1>
            <h2>FICHE DE RECOUVREMENT DES PAIEMENTS</h2>
            <p>Date de génération: ${dateGeneration}</p>
            ${dateDebut || dateFin ? `<p>Période: ${dateDebut ? format(new Date(dateDebut), 'dd/MM/yyyy') : 'Début'} - ${dateFin ? format(new Date(dateFin), 'dd/MM/yyyy') : 'Fin'}</p>` : ''}
          </div>

          <div class="stats">
            <div class="stat-card">
              <div class="label">Total Élèves</div>
              <div class="value">${stats.totalEleves}</div>
            </div>
            <div class="stat-card">
              <div class="label">Montant Attendu</div>
              <div class="value">${stats.montantAttendu.toLocaleString('fr-FR')} FCFA</div>
            </div>
            <div class="stat-card">
              <div class="label">Montant Perçu</div>
              <div class="value">${stats.montantPercu.toLocaleString('fr-FR')} FCFA</div>
            </div>
            <div class="stat-card">
              <div class="label">Taux Recouvrement</div>
              <div class="value">${stats.tauxRecouvrement.toFixed(1)}%</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Matricule</th>
                <th>Nom & Prénoms</th>
                <th>Classe</th>
                <th>Montant Attendu</th>
                <th>Montant Payé</th>
                <th>Reste à Payer</th>
                <th>%</th>
                <th>Statut</th>
                <th>Dernier Paiement</th>
              </tr>
            </thead>
            <tbody>
              ${elevesFiltered.map((er, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${er.eleve.matricule}</td>
                  <td>${er.eleve.nom} ${er.eleve.prenoms}</td>
                  <td>${er.classe ? `${er.classe.niveau} ${er.classe.section}` : '-'}</td>
                  <td>${er.montantAttendu.toLocaleString('fr-FR')}</td>
                  <td>${er.montantPaye.toLocaleString('fr-FR')}</td>
                  <td>${er.montantRestant.toLocaleString('fr-FR')}</td>
                  <td>${er.pourcentagePaye.toFixed(0)}%</td>
                  <td class="status-${er.statut.toLowerCase()}">${er.statut}</td>
                  <td>${er.dernierPaiement ? format(new Date(er.dernierPaiement.datePaiement), 'dd/MM/yyyy') : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>Document généré automatiquement par KlasNet - ${ecole?.nom || ''}</p>
            <p>Imprimé le ${dateGeneration}</p>
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 100);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Fonction d'export Excel
  const handleExportExcel = () => {
    const ecole = db.getAll('ecole')[0];
    const dateGeneration = format(new Date(), 'dd/MM/yyyy HH:mm');

    let csv = `Fiche de Recouvrement - ${ecole?.nom || 'École'}\n`;
    csv += `Date de génération: ${dateGeneration}\n`;
    if (dateDebut || dateFin) {
      csv += `Période: ${dateDebut ? format(new Date(dateDebut), 'dd/MM/yyyy') : 'Début'} - ${dateFin ? format(new Date(dateFin), 'dd/MM/yyyy') : 'Fin'}\n`;
    }
    csv += `\n`;
    csv += `STATISTIQUES GLOBALES\n`;
    csv += `Total Élèves,${stats.totalEleves}\n`;
    csv += `Payés,${stats.elevesPayes}\n`;
    csv += `Partiels,${stats.elevesPartiels}\n`;
    csv += `Impayés,${stats.elevesImpayes}\n`;
    csv += `Montant Attendu,${stats.montantAttendu}\n`;
    csv += `Montant Perçu,${stats.montantPercu}\n`;
    csv += `Taux Recouvrement,${stats.tauxRecouvrement.toFixed(2)}%\n`;
    csv += `\n`;
    csv += `DÉTAIL PAR ÉLÈVE\n`;
    csv += `N°,Matricule,Nom,Prénoms,Classe,Montant Attendu,Montant Payé,Reste à Payer,Pourcentage,Statut,Dernier Paiement,Nb Paiements\n`;

    elevesFiltered.forEach((er, index) => {
      csv += `${index + 1},`;
      csv += `${er.eleve.matricule},`;
      csv += `${er.eleve.nom},`;
      csv += `${er.eleve.prenoms},`;
      csv += `${er.classe ? `${er.classe.niveau} ${er.classe.section}` : '-'},`;
      csv += `${er.montantAttendu},`;
      csv += `${er.montantPaye},`;
      csv += `${er.montantRestant},`;
      csv += `${er.pourcentagePaye.toFixed(2)}%,`;
      csv += `${er.statut},`;
      csv += `${er.dernierPaiement ? format(new Date(er.dernierPaiement.datePaiement), 'dd/MM/yyyy') : '-'},`;
      csv += `${er.paiements.length}\n`;
    });

    // Télécharger le fichier
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `recouvrement_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <ModuleContainer
      title="Fiches de Recouvrement"
      subtitle="Suivi détaillé des paiements et du recouvrement"
      icon={FileText}
    >
      <div className="space-y-6">
        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 sm:p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <Users className="h-8 w-8 text-blue-600" />
              <span className="text-2xl sm:text-3xl font-bold text-blue-900">{stats.totalEleves}</span>
            </div>
            <p className="text-sm text-blue-700 font-medium">Total Élèves</p>
            <div className="mt-2 text-xs text-blue-600">
              {stats.elevesPayes} payés · {stats.elevesPartiels} partiels · {stats.elevesImpayes} impayés
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 sm:p-6 border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <span className="text-2xl sm:text-3xl font-bold text-green-900">{stats.elevesPayes}</span>
            </div>
            <p className="text-sm text-green-700 font-medium">Élèves Payés</p>
            <div className="mt-2 text-xs text-green-600">
              {stats.totalEleves > 0 ? ((stats.elevesPayes / stats.totalEleves) * 100).toFixed(1) : 0}% du total
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 sm:p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <DollarSign className="h-8 w-8 text-purple-600" />
              <span className="text-lg sm:text-xl font-bold text-purple-900">
                {stats.montantPercu.toLocaleString('fr-FR')}
              </span>
            </div>
            <p className="text-sm text-purple-700 font-medium">Montant Perçu (FCFA)</p>
            <div className="mt-2 text-xs text-purple-600">
              sur {stats.montantAttendu.toLocaleString('fr-FR')} attendu
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 sm:p-6 border border-amber-200">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="h-8 w-8 text-amber-600" />
              <span className="text-2xl sm:text-3xl font-bold text-amber-900">
                {stats.tauxRecouvrement.toFixed(1)}%
              </span>
            </div>
            <p className="text-sm text-amber-700 font-medium">Taux de Recouvrement</p>
            <div className="mt-2 h-2 bg-amber-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-600 transition-all duration-500"
                style={{ width: `${Math.min(100, stats.tauxRecouvrement)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filtres et Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            {/* Recherche */}
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un élève..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Filtre classe */}
            <select
              value={selectedClasse}
              onChange={(e) => setSelectedClasse(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="all">Toutes les classes</option>
              {classes.map(classe => (
                <option key={classe.id} value={classe.id}>
                  {classe.niveau} {classe.section}
                </option>
              ))}
            </select>

            {/* Filtre statut */}
            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="all">Tous les statuts</option>
              <option value="Payé">✓ Payé</option>
              <option value="Partiel">⚠ Partiel</option>
              <option value="Impayé">✗ Impayé</option>
            </select>

            {/* Tri */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="nom">Trier par nom</option>
              <option value="classe">Trier par classe</option>
              <option value="montantPaye">Trier par montant payé</option>
              <option value="montantRestant">Trier par reste</option>
            </select>
          </div>

          {/* Filtre période */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Date début
              </label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Date fin
              </label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimer</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Exporter Excel</span>
            </button>

            {(dateDebut || dateFin || selectedClasse !== 'all' || selectedStatut !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setDateDebut('');
                  setDateFin('');
                  setSelectedClasse('all');
                  setSelectedStatut('all');
                  setSearchTerm('');
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Filter className="h-4 w-4" />
                <span>Réinitialiser</span>
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    N°
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('nom')}
                  >
                    Élève {sortBy === 'nom' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors hidden lg:table-cell"
                    onClick={() => handleSort('classe')}
                  >
                    Classe {sortBy === 'classe' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Attendu
                  </th>
                  <th 
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('montantPaye')}
                  >
                    Payé {sortBy === 'montantPaye' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors hidden md:table-cell"
                    onClick={() => handleSort('montantRestant')}
                  >
                    Reste {sortBy === 'montantRestant' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                    Dernier Paiement
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {elevesFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-lg font-medium">Aucun élève trouvé</p>
                      <p className="text-sm mt-1">Essayez de modifier vos filtres</p>
                    </td>
                  </tr>
                ) : (
                  elevesFiltered.map((er, index) => (
                    <tr key={er.eleve.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {er.eleve.nom} {er.eleve.prenoms}
                          </div>
                          <div className="text-xs text-gray-500">{er.eleve.matricule}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 hidden lg:table-cell">
                        {er.classe ? `${er.classe.niveau} ${er.classe.section}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 hidden md:table-cell">
                        {er.montantAttendu.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">
                        {er.montantPaye.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-red-600 hidden md:table-cell">
                        {er.montantRestant.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {er.statut === 'Payé' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Payé
                          </span>
                        )}
                        {er.statut === 'Partiel' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Partiel
                          </span>
                        )}
                        {er.statut === 'Impayé' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Impayé
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600 hidden xl:table-cell">
                        {er.dernierPaiement 
                          ? format(new Date(er.dernierPaiement.datePaiement), 'dd/MM/yyyy', { locale: fr })
                          : '-'
                        }
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Résumé */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
          <p>
            <strong>{elevesFiltered.length}</strong> élève(s) affiché(s) sur <strong>{elevesRecouvrement.length}</strong> au total
          </p>
        </div>
      </div>
    </ModuleContainer>
  );
}
