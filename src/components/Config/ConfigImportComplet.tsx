import React, { useState } from 'react';
import { Upload, CheckCircle, XCircle, AlertCircle, Users, BookOpen, DollarSign, Settings } from 'lucide-react';
import { importerElevesEtPaiementsComplet, analyzeExcelStructure, ColumnMapping, ExcelAnalysis } from '../../utils/excelImportExport';

interface ImportResults {
  elevesCreated: Array<{ nom: string; prenoms: string; classe: string; matricule: string; protege: boolean }>;
  classesCreated: Array<{ niveau: string; section: string }>;
  paiementsApplied: Array<{ eleveName: string; totalAmount: number; details: string }>;
  errors: Array<{ row: number; error: string; name?: string }>;
}

export default function ConfigImportComplet() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);
  const [error, setError] = useState<string>('');
  const [analysis, setAnalysis] = useState<ExcelAnalysis | null>(null);
  const [showMapping, setShowMapping] = useState(false);
  const [customMapping, setCustomMapping] = useState<ColumnMapping | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
      setError('');
      setAnalysis(null);
      setShowMapping(false);
      setCustomMapping(null);
      setSelectedSheet('');

      // Analyser automatiquement le fichier
      setLoading(true);
      try {
        const fileAnalysis = await analyzeExcelStructure(selectedFile);
        setAnalysis(fileAnalysis);
        setSelectedSheet(fileAnalysis.selectedSheet);
        console.log('📊 Analyse automatique:', fileAnalysis);
        
        // Si la confiance est faible, afficher l'interface de mapping
        if (fileAnalysis.confidence.overall < 80) {
          setShowMapping(true);
          setCustomMapping(fileAnalysis.detectedMapping);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSheetChange = async (sheetName: string) => {
    if (!file) return;
    
    setSelectedSheet(sheetName);
    setLoading(true);
    setError('');
    
    try {
      const fileAnalysis = await analyzeExcelStructure(file, sheetName);
      setAnalysis(fileAnalysis);
      setCustomMapping(fileAnalysis.detectedMapping);
      console.log('📊 Analyse de la feuille:', sheetName, fileAnalysis);
      
      // Si la confiance est faible, afficher l'interface de mapping
      if (fileAnalysis.confidence.overall < 80) {
        setShowMapping(true);
      } else {
        setShowMapping(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      // Utiliser le mapping personnalisé si disponible, sinon laisser la fonction détecter
      const importResults = await importerElevesEtPaiementsComplet(file, customMapping || undefined);
      
      // Vérifier si on a besoin de validation
      if ((importResults as any).needsValidation) {
        setAnalysis((importResults as any).analysis);
        setShowMapping(true);
        setCustomMapping((importResults as any).analysis.detectedMapping);
        setLoading(false);
        return;
      }
      
      setResults(importResults as ImportResults);
      
      // Rafraîchir la page après un import réussi
      if ((importResults as ImportResults).elevesCreated.length > 0) {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('dataChanged'));
        }, 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (field: keyof ColumnMapping, value: number) => {
    setCustomMapping(prev => ({
      ...prev!,
      [field]: value >= 0 ? value : undefined
    }));
  };

  const handleConfirmMapping = () => {
    setShowMapping(false);
    // L'import utilisera le customMapping
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Importation Complète (Élèves + Paiements)
        </h2>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Format du fichier Excel requis:</h3>
          <ul className="text-sm text-blue-800 space-y-1 ml-4">
            <li>• <strong>Nom & Prénoms</strong>: Nom complet de l'élève</li>
            <li>• <strong>Classe</strong>: Classe de l'élève (ex: CP1 A, CE2 B)</li>
            <li>• <strong>Contact</strong>: Numéro de téléphone du parent (père par défaut)</li>
            <li>• <strong>Colonnes de mois</strong>: Inscription, Octobre, Novembre, Décembre, etc.</li>
            <li>• <strong>Statut</strong>: Pour détecter les élèves protégés (optionnel)</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-green-900 mb-2">✨ Fonctionnalités intelligentes:</h3>
          <ul className="text-sm text-green-800 space-y-1 ml-4">
            <li>• <strong>Création automatique des classes</strong> basée sur la colonne "Classe"</li>
            <li>• <strong>Détection des élèves protégés</strong> (ne paient que l'inscription)</li>
            <li>• <strong>Allocation intelligente des paiements</strong> sur les échéances</li>
            <li>• <strong>Gestion des paiements excédentaires</strong> (report automatique)</li>
            <li>• <strong>Importation des contacts parents</strong> (insensible à la casse)</li>
          </ul>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sélectionner le fichier Excel
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Fichier sélectionné: <strong>{file.name}</strong>
              </p>
            )}
          </div>

          {/* Sélecteur de feuille si plusieurs feuilles disponibles */}
          {analysis && analysis.sheets.length > 1 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 mb-2">📚 Sélection de la feuille</h4>
              <p className="text-sm text-purple-800 mb-3">
                Votre fichier contient plusieurs feuilles. Sélectionnez celle qui contient les données à importer :
              </p>
              <select
                value={selectedSheet}
                onChange={(e) => handleSheetChange(e.target.value)}
                className="w-full border border-purple-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                {analysis.sheets.map((sheet, idx) => (
                  <option key={idx} value={sheet}>{sheet}</option>
                ))}
              </select>
            </div>
          )}

          {/* Afficher l'analyse si disponible */}
          {analysis && !showMapping && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">✅ Colonnes détectées automatiquement</h4>
              <div className="text-sm text-green-800 space-y-1">
                {analysis.suggestions.map((s, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{s.column}:</span>
                    <span className="font-medium">{s.detectedName} ({s.confidence}% confiance)</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowMapping(true)}
                className="mt-3 text-sm text-green-700 hover:text-green-900 underline flex items-center space-x-1"
              >
                <Settings className="w-4 h-4" />
                <span>Modifier le mapping</span>
              </button>
            </div>
          )}

          {/* Interface de mapping manuel */}
          {showMapping && analysis && customMapping && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-3 flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Configuration du mapping des colonnes</span>
              </h4>
              <p className="text-sm text-yellow-800 mb-4">
                Sélectionnez les colonnes correspondantes dans votre fichier Excel :
              </p>
              
              <div className="space-y-3">
                {/* Nom & Prénoms combiné */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom & Prénoms (combiné) - Optionnel si colonnes séparées
                  </label>
                  <select
                    value={customMapping.nomPrenomsCombined ?? -1}
                    onChange={(e) => handleMappingChange('nomPrenomsCombined', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value={-1}>-- Non utilisé --</option>
                    {analysis.headers.map((h, idx) => (
                      <option key={idx} value={idx}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Nom séparé */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom (séparé) - Optionnel si colonne combinée
                  </label>
                  <select
                    value={customMapping.nom ?? -1}
                    onChange={(e) => handleMappingChange('nom', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value={-1}>-- Non utilisé --</option>
                    {analysis.headers.map((h, idx) => (
                      <option key={idx} value={idx}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Prénoms séparé */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénoms (séparé) - Optionnel si colonne combinée
                  </label>
                  <select
                    value={customMapping.prenoms ?? -1}
                    onChange={(e) => handleMappingChange('prenoms', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value={-1}>-- Non utilisé --</option>
                    {analysis.headers.map((h, idx) => (
                      <option key={idx} value={idx}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Classe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Classe <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={customMapping.classe}
                    onChange={(e) => handleMappingChange('classe', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    {analysis.headers.map((h, idx) => (
                      <option key={idx} value={idx}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Contact */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact / Téléphone - Optionnel
                  </label>
                  <select
                    value={customMapping.contact ?? -1}
                    onChange={(e) => handleMappingChange('contact', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value={-1}>-- Non utilisé --</option>
                    {analysis.headers.map((h, idx) => (
                      <option key={idx} value={idx}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Protégé */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Protégé ? - Optionnel
                  </label>
                  <select
                    value={customMapping.protege ?? -1}
                    onChange={(e) => handleMappingChange('protege', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value={-1}>-- Non utilisé --</option>
                    {analysis.headers.map((h, idx) => (
                      <option key={idx} value={idx}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleConfirmMapping}
                className="mt-4 w-full bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Confirmer le mapping
              </button>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={!file || loading || showMapping}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Analyse en cours...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Lancer l'importation</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900">Erreur d'importation</h4>
              <p className="text-sm text-red-800 mt-1">{error}</p>
            </div>
          </div>
        )}
      </div>

      {results && (
        <div className="space-y-4">
          {/* Résumé */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <span>Résumé de l'importation</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Users className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-900">{results.elevesCreated.length}</p>
                    <p className="text-sm text-blue-700">Élèves importés</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-900">{results.classesCreated.length}</p>
                    <p className="text-sm text-green-700">Classes créées</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-purple-900">{results.paiementsApplied.length}</p>
                    <p className="text-sm text-purple-700">Paiements traités</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Classes créées */}
          {results.classesCreated.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="font-semibold text-gray-800 mb-3">Classes créées automatiquement</h4>
              <div className="flex flex-wrap gap-2">
                {results.classesCreated.map((classe, idx) => (
                  <span
                    key={idx}
                    className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {classe.niveau} {classe.section}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Élèves importés */}
          {results.elevesCreated.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="font-semibold text-gray-800 mb-3">Élèves importés</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matricule</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom & Prénoms</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Classe</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.elevesCreated.map((eleve, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{eleve.matricule}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{eleve.nom} {eleve.prenoms}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{eleve.classe}</td>
                        <td className="px-4 py-3 text-sm">
                          {eleve.protege ? (
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                              Protégé
                            </span>
                          ) : (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Paiements appliqués */}
          {results.paiementsApplied.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="font-semibold text-gray-800 mb-3">Paiements traités</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.paiementsApplied.map((paiement, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{paiement.eleveName}</p>
                        <p className="text-sm text-gray-600 mt-1">{paiement.details}</p>
                      </div>
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {paiement.totalAmount.toLocaleString()} FCFA
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Erreurs */}
          {results.errors.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h4 className="font-semibold text-red-800 mb-3 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5" />
                <span>Erreurs rencontrées ({results.errors.length})</span>
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {results.errors.map((err, idx) => (
                  <div key={idx} className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <p className="text-sm text-red-900">
                      <strong>Ligne {err.row}</strong>
                      {err.name && <span> - {err.name}</span>}: {err.error}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
