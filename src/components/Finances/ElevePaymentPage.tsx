import { useState, useMemo, useRef, useEffect } from 'react';
import useUnsavedWarning from '../../hooks/useUnsavedWarning';
import useAutoSave from '../../hooks/useAutoSave';
import DiscardModal from '../UI/DiscardModal';
import { ArrowLeft, Printer, Receipt, FileText, CreditCard, AlertTriangle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import Button from '../UI/Button';
import { db } from '../../utils/database';
import { formatNomPrenoms } from '../../utils/formatName';
import { getCurrentUser } from '../../utils/auth';
import { Eleve, Classe, Paiement, Enseignant } from '../../types';
import { useToast } from '../Layout/ToastProvider';
import { echeancesManager } from '../../utils/echeancesManager';
import RecuPaiement from './RecuPaiement';
import CombinedRecu from './CombinedRecu';

interface ElevePaymentPageProps {
  eleve: Eleve;
  onBack: () => void;
}

export default function ElevePaymentPage({ eleve, onBack }: ElevePaymentPageProps) {
  const { showToast } = useToast();
  const [selectedEcheances, setSelectedEcheances] = useState<string[]>([]);
  const [selectedPaiements, setSelectedPaiements] = useState<string[]>([]);
  const [montantReglement, setMontantReglement] = useState<string>('');
  const [showRecuModal, setShowRecuModal] = useState(false);
  const [showCombinedRecuModal, setShowCombinedRecuModal] = useState(false);
  const [selectedPaiementForRecu, setSelectedPaiementForRecu] = useState<Paiement | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelNote, setCancelNote] = useState('');

  const initialRef = useRef<any>({ selectedEcheances: [], montantReglement: '' });
  const isDirty = (selectedEcheances.length > 0) || (montantReglement && montantReglement.trim() !== '');
  const controller = useUnsavedWarning(Boolean(isDirty));

  const autosaveKey = `elevePayment:${eleve.id}`;
  const { load: loadDraft, clear: clearDraft } = useAutoSave<{ selectedEcheances: string[]; montantReglement: string }>(autosaveKey, { selectedEcheances, montantReglement });

  // try load draft once
  useEffect(() => {
    try {
      const d = loadDraft();
      if (d) {
        setSelectedEcheances(d.selectedEcheances || []);
        setMontantReglement(d.montantReglement || '');
        initialRef.current = d;
      }
    } catch (e) { /* ignore */ }
  }, []);

  const classe = db.getById<Classe>('classes', eleve.classeId);
  const situationEcheances = echeancesManager.getSituationEcheances(eleve.id);
  const isProtege = !!eleve?.protege;
  const garant = classe ? db.getById<Enseignant>('enseignants', classe.enseignantPrincipal) : null;
  const paiements = db.getAll<Paiement>('paiements').filter(p => p.eleveId === eleve.id && !p.canceled);

  const displayTotals = useMemo(() => {
    if (!situationEcheances) return { totalDu: 0, totalPaye: 0, totalRestant: 0, echeancesEchues: 0 };
    if (!isProtege) {
      return {
        totalDu: situationEcheances.totalDu || 0,
        totalPaye: situationEcheances.totalPaye || 0,
        totalRestant: situationEcheances.totalRestant || 0,
        echeancesEchues: (situationEcheances.echeancesEchues || []).length
      };
    }

    const ins = (situationEcheances.echeances || []).filter((e: any) => e.modalite === 1);
    const totalDuIns = ins.reduce((sum: number, e: any) => sum + (e.montant || 0), 0);
    const totalPayeIns = ins.reduce((sum: number, e: any) => sum + ((e.montantPaye) || 0), 0);
    const totalRestantIns = ins.reduce((sum: number, e: any) => sum + ((e.montantRestant) || 0), 0);
    const echeancesEchuesIns = ins.filter((e: any) => e.isEchue).length;

    return {
      totalDu: totalDuIns,
      totalPaye: totalPayeIns,
      totalRestant: totalRestantIns,
      echeancesEchues: echeancesEchuesIns
    };
  }, [situationEcheances, isProtege]);

  const montantTotal = useMemo(() => {
    if (!situationEcheances) return 0;
    // For protected students, only consider inscription (modalite === 1)
    const relevant = situationEcheances.echeances.filter((e: any) => selectedEcheances.includes(e.echeanceId) && (!isProtege || e.modalite === 1));
    return relevant.reduce((sum, e) => sum + e.montantRestant, 0);
  }, [selectedEcheances, situationEcheances]);

  const handleSelectEcheance = (echeanceId: string, checked: boolean) => {
    // Prevent selecting non-inscription échéances for protégés
    if (isProtege && situationEcheances) {
      const ech = situationEcheances.echeances.find((e: any) => e.echeanceId === echeanceId);
      if (ech && ech.modalite !== 1) return;
    }
    setSelectedEcheances(prev => 
      checked ? [...prev, echeanceId] : prev.filter(id => id !== echeanceId)
    );
  };

  const handleSelectAllEcheances = (checked: boolean) => {
    if (!situationEcheances) return;
    if (checked) {
      const impayees = situationEcheances.echeances
        .filter((e: any) => e.montantRestant > 0 && (!isProtege || e.modalite === 1))
        .map((e: any) => e.echeanceId);
      setSelectedEcheances(impayees);
    } else {
      setSelectedEcheances([]);
    }
  };

  const handleSelectPaiement = (paiementId: string, checked: boolean) => {
    setSelectedPaiements(prev => 
      checked ? [...prev, paiementId] : prev.filter(id => id !== paiementId)
    );
  };

  const handleSelectAllPaiements = (checked: boolean) => {
    if (checked) {
      const ids = paiements.filter(p => !(p as any).canceled).map(p => p.id);
      setSelectedPaiements(ids);
    } else {
      setSelectedPaiements([]);
    }
  };

  // Fonction de règlement directe non utilisée (préservée pour futur usage)

  const handleReglerEcheancesAvecOptions = async (modePaiement: string = 'Espèces') => {
    if (selectedEcheances.length === 0) {
      showToast('Sélectionnez au moins une échéance à régler', 'error');
      return;
    }

    // Choisir le montant à régler : si l'utilisateur a saisi un montant, l'utiliser,
    // sinon utiliser le montant total des échéances sélectionnées.
    const valeurSaisie = montantReglement && montantReglement.trim() !== '' ? Number(montantReglement) : undefined;
    const montantARegler = valeurSaisie !== undefined ? valeurSaisie : montantTotal;
    if (!Number.isFinite(montantARegler) || montantARegler <= 0) { showToast('Montant invalide', 'error'); return; }
    if (montantARegler > montantTotal) { showToast('Le montant ne peut pas dépasser le total sélectionné', 'error'); return; }

    try {
      const currentUser = getCurrentUser();
      const operateur = currentUser ? `${currentUser.prenoms} ${currentUser.nom}` : 'ADMIN';
      const numeroRecu = 'REC' + Date.now().toString().slice(-8);
      await echeancesManager.processPaymentIntelligent(
        eleve.id,
        montantARegler,
        new Date().toISOString(),
        {
          typeFrais: 'scolarite',
          modePaiement,
          numeroRecu,
          operateur,
          notes: `Règlement de ${selectedEcheances.length} échéance(s) - ${modePaiement}`,
          selectedEcheances: selectedEcheances
        }
      );

      // Ajouter à l'historique
      db.addHistorique({
        type: 'paiement',
        cible: 'Paiement',
  description: `Paiement de ${montantTotal.toLocaleString('fr-FR')} FCFA pour ${formatNomPrenoms(eleve)} (${numeroRecu})`,
        utilisateur: operateur
      });

      showToast(`Paiement de ${montantTotal.toLocaleString('fr-FR')} FCFA enregistré avec succès`, 'success');
    setSelectedEcheances([]);
    try { clearDraft(); } catch (err) { /* ignore */ }
    setTimeout(() => { /* db dispatches dataChanged */ }, 800);
    } catch (error) {
      console.error('Erreur paiement:', error);
      const msg = error && (error as any).message ? (error as any).message : 'Erreur lors de l\'enregistrement du paiement';
      showToast(msg, 'error');
    }
  };

  const handlePrintRecu = (paiement: Paiement) => {
    setSelectedPaiementForRecu(paiement);
    setShowRecuModal(true);
  };

  const handlePrintCombinedRecu = () => {
    if (selectedPaiements.length === 0) {
      showToast('Sélectionnez au moins un paiement', 'error');
      return;
    }
    setShowCombinedRecuModal(true);
  };

  const getEcheanceStatusColor = (echeance: any) => {
    if (echeance.montantRestant === 0) return 'bg-green-50 text-green-700 border-green-300';
    if (echeance.isEchue) return 'bg-red-50 text-red-700 border-red-300';
    return 'bg-yellow-50 text-yellow-700 border-yellow-300';
  };

  const getEcheanceStatusIcon = (echeance: any) => {
    if (echeance.montantRestant === 0) return <CheckCircle className="h-4 w-4" />;
    if (echeance.isEchue) return <AlertTriangle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  if (!situationEcheances) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" onClick={() => { if (isDirty && controller) return controller.openPrompt(); return onBack(); }} className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Retour</span>
          </Button>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Aucune configuration de frais trouvée pour cet élève</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* En-tête avec navigation */}
      <div className="bg-white border border-gray-200 p-6 rounded-lg">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => { if (isDirty && controller) return controller.openPrompt(); return onBack(); }} className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-medium">Retour aux finances</span>
          </Button>
          <div className="h-6 w-px bg-gray-300"></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {formatNomPrenoms(eleve)}
            </h1>
              <p className="text-gray-600">
                {classe ? `${classe.niveau} ${classe.section}` : 'Classe non assignée'} • {eleve.matricule}
              </p>
              {isProtege && garant && (
                <div className="mt-1 text-sm text-gray-700">
                  Garant: {formatNomPrenoms(garant)} • <span className="text-xs text-gray-500">Enseignant principal</span>
                </div>
              )}
          </div>
        </div>
        
          <div className="mt-4 text-right bg-gray-50 border border-gray-200 rounded-md p-4">
          <div className="text-sm text-gray-600">Reste à payer</div>
          <div className="text-2xl font-bold text-gray-900">
            {displayTotals.totalRestant.toLocaleString('fr-FR')} FCFA
          </div>
          <div className="text-sm text-gray-600 mt-1">
            sur {displayTotals.totalDu.toLocaleString('fr-FR')} FCFA
          </div>
        </div>
      </div>

      {/* Résumé financier */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-md border border-gray-200 p-4 text-center">
          <div className="bg-gray-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-gray-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {displayTotals.totalDu.toLocaleString('fr-FR')}
          </div>
          <p className="text-gray-600 text-sm">Total dû (FCFA)</p>
        </div>
        
        <div className="bg-white rounded-md border border-gray-200 p-4 text-center">
          <div className="bg-gray-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-gray-600" />
          </div>
          <div className="text-2xl font-bold text-green-600">
            {displayTotals.totalPaye.toLocaleString('fr-FR')}
          </div>
          <p className="text-gray-600 text-sm">Total payé (FCFA)</p>
        </div>
        
        <div className="bg-white rounded-md border border-gray-200 p-4 text-center">
          <div className="bg-gray-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-gray-600" />
          </div>
          <div className="text-2xl font-bold text-red-600">
            {displayTotals.totalRestant.toLocaleString('fr-FR')}
          </div>
          <p className="text-gray-600 text-sm">Reste à payer (FCFA)</p>
        </div>
        
        <div className="bg-white rounded-md border border-gray-200 p-4 text-center">
          <div className="bg-gray-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
            <Clock className="h-6 w-6 text-gray-600" />
          </div>
          <div className="text-2xl font-bold text-orange-600">
            {displayTotals.echeancesEchues}
          </div>
          <p className="text-gray-600 text-sm">Échéances échues</p>
        </div>
      </div>

      {/* Échéances à payer */}
      <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Échéances de paiement
            </h2>
            <div className="flex items-center space-x-4">
              {selectedEcheances.length > 0 && (
                <div className="text-sm text-gray-700 bg-gray-100 px-3 py-1 rounded-md border border-gray-200">
                  {selectedEcheances.length} sélectionnée(s) • {montantTotal.toLocaleString('fr-FR')} FCFA
                </div>
              )}
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedEcheances.length === situationEcheances.echeances.filter(e => e.montantRestant > 0).length}
                  onChange={(e) => handleSelectAllEcheances(e.target.checked)}
                  className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-500"
                />
                <span className="text-sm text-gray-700 font-medium">Tout sélectionner</span>
              </label>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-3">
            {situationEcheances.echeances.filter((e: any) => !isProtege || e.modalite === 1).map((echeance) => (
              <div
                key={echeance.echeanceId}
                className={`border rounded-md p-4 transition-all ${
                  selectedEcheances.includes(echeance.echeanceId)
                    ? 'border-gray-900 bg-gray-50'
                    : getEcheanceStatusColor(echeance)
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {echeance.montantRestant > 0 && (
                      <input
                        type="checkbox"
                        checked={selectedEcheances.includes(echeance.echeanceId)}
                        onChange={(e) => handleSelectEcheance(echeance.echeanceId, e.target.checked)}
                        className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-500"
                        disabled={isProtege && echeance.modalite !== 1}
                      />
                    )}
                    <div className="flex items-center space-x-3">
                      {getEcheanceStatusIcon(echeance)}
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Modalité {echeance.modalite} - {echeance.label}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Échéance : {new Date(echeance.date).toLocaleDateString('fr-FR')}
                          {echeance.isEchue && echeance.joursRetard > 0 && (
                            <span className="ml-2 text-red-600 font-medium">
                              (En retard de {echeance.joursRetard} jour{echeance.joursRetard > 1 ? 's' : ''})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {echeance.montant.toLocaleString('fr-FR')} FCFA
                    </div>
                    <div className="text-sm text-gray-600">
                      Payé : {echeance.montantPaye.toLocaleString('fr-FR')} FCFA
                    </div>
                    {echeance.montantRestant > 0 && (
                      <div className="text-sm font-medium text-red-600">
                        Reste : {echeance.montantRestant.toLocaleString('fr-FR')} FCFA
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bouton de règlement */}
          {selectedEcheances.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex items-center justify-between">
                  <div>
                  <h3 className="font-semibold text-gray-900">
                    Règlement de {selectedEcheances.length} échéance{selectedEcheances.length > 1 ? 's' : ''}
                  </h3>
                  <p className="text-gray-700">
                    Montant total : {montantTotal.toLocaleString('fr-FR')} FCFA
                  </p>
                  <div className="mt-2">
                    <label className="text-sm text-gray-700">Montant à régler (FCFA)</label>
                    <div className="mt-1 flex items-center space-x-2">
                      <input
                        type="number"
                        value={montantReglement}
                        onChange={(e) => setMontantReglement(e.target.value)}
                        placeholder={String(montantTotal)}
                        className="px-3 py-2 border border-gray-300 rounded-md w-40"
                      />
                      <button
                        className="px-3 py-2 bg-gray-100 rounded-md text-sm"
                        onClick={() => setMontantReglement(String(montantTotal))}
                      >
                        Utiliser le total
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Pour les protégés, l'inscription doit être réglée en totalité; la validation côté gestionnaire le vérifiera.</p>
                  </div>
                </div>
                <div className="flex space-x-3 items-center">
                  {isProtege && (
                    <div className="text-sm text-gray-600 mr-4">Protégé : seules les échéances d'inscription sont payables.</div>
                  )}
                  <Button variant="primary" onClick={() => handleReglerEcheancesAvecOptions('Espèces')} className="flex items-center space-x-2">💵 <span>Espèces</span></Button>
                  <Button variant="primary" onClick={() => handleReglerEcheancesAvecOptions('Mobile Money')} className="flex items-center space-x-2">📱 <span>Mobile</span></Button>
                  <Button variant="secondary" onClick={() => handleReglerEcheancesAvecOptions('Chèque')} className="flex items-center space-x-2"><CreditCard className="h-4 w-4" /><span>Chèque</span></Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historique des paiements */}
      <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Historique des paiements
            </h2>
            <div className="flex items-center space-x-4">
              {selectedPaiements.length > 0 && (
                <div className="text-sm text-gray-700 bg-gray-100 px-3 py-1 rounded-md border border-gray-200">
                  {selectedPaiements.length} sélectionné{selectedPaiements.length > 1 ? 's' : ''}
                </div>
              )}
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedPaiements.length === paiements.length && paiements.length > 0}
                  onChange={(e) => handleSelectAllPaiements(e.target.checked)}
                  className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-500"
                />
                <span className="text-sm text-gray-700 font-medium">Tout sélectionner</span>
              </label>
            </div>
          </div>
        </div>

        <div className="p-6">
              {paiements.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun paiement enregistré</p>
              <p className="text-gray-400 text-sm mt-1">Les paiements apparaîtront ici une fois effectués</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paiements.map((paiement) => (
                <div
                  key={paiement.id}
                  className={`border rounded-md p-4 transition-all ${
                    selectedPaiements.includes(paiement.id)
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {((paiement as any).canceled) ? (
                        <div className="text-sm text-red-600 font-semibold">Annulé</div>
                      ) : (
                        <input
                          type="checkbox"
                          checked={selectedPaiements.includes(paiement.id)}
                          onChange={(e) => handleSelectPaiement(paiement.id, e.target.checked)}
                          className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-500"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {paiement.montant.toLocaleString('fr-FR')} FCFA
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(paiement.datePaiement || paiement.createdAt).toLocaleDateString('fr-FR')} • 
                          {(paiement as any).modePaiement || 'Espèces'} • 
                          Reçu : {(paiement as any).numeroRecu || 'N/A'}
                        </p>
                        {(paiement as any).notes && (
                          <p className="text-xs text-gray-500 mt-1">{(paiement as any).notes}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePrintRecu(paiement)}
                        disabled={(paiement as any).canceled}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors font-medium ${((paiement as any).canceled) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-700 text-white hover:bg-gray-800'}`}
                      >
                        <Printer className="h-4 w-4" />
                        <span>Reçu</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions sur les paiements sélectionnés */}
          {selectedPaiements.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Actions sur {selectedPaiements.length} paiement{selectedPaiements.length > 1 ? 's' : ''}
                  </h3>
                  <p className="text-gray-700 text-sm mt-1">
                    Montant total : {selectedPaiements.reduce((sum, id) => {
                      const p = paiements.find(paiement => paiement.id === id);
                      return sum + (p?.montant || 0);
                    }, 0).toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handlePrintCombinedRecu}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-medium"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Reçu combiné</span>
                  </button>
                    <button
                      onClick={() => {
                        if (selectedPaiements.length === 0) return;
                        setCancelNote('');
                        setShowCancelModal(true);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
                    >
                      <span>Annuler</span>
                    </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showRecuModal && selectedPaiementForRecu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <RecuPaiement
              eleve={{
                nom: eleve.nom,
                prenoms: eleve.prenoms,
                matricule: eleve.matricule,
                classe: classe ? `${classe.niveau} ${classe.section}` : ''
              }}
              montantRegle={selectedPaiementForRecu.montant}
              date={selectedPaiementForRecu.datePaiement || selectedPaiementForRecu.createdAt}
              mode={(selectedPaiementForRecu as any).modePaiement || 'Espèces'}
              cumulReglement={displayTotals.totalPaye}
              resteAPayer={displayTotals.totalRestant}
              anneeScolaire={classe?.anneeScolaire || ''}
              operateur={(selectedPaiementForRecu as any).operateur || 'ADMIN'}
              numeroRecu={(selectedPaiementForRecu as any).numeroRecu || 'REC' + Date.now().toString().slice(-8)}
            />
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowRecuModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showCombinedRecuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <CombinedRecu
              eleve={eleve}
              paiements={paiements.filter(p => selectedPaiements.includes(p.id))}
              classe={classe}
              anneeScolaire={classe?.anneeScolaire}
              totalAttendu={displayTotals.totalDu}
            />
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowCombinedRecuModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel payments modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2">Annuler {selectedPaiements.length} paiement{selectedPaiements.length > 1 ? 's' : ''}</h3>
              <p className="text-sm text-gray-600 mb-4">Veuillez indiquer la raison de l'annulation. Cette note sera enregistrée dans l'historique.</p>
              <textarea value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} rows={4} className="w-full border border-gray-300 rounded p-2" placeholder="Motif d'annulation (ex: erreur saisie, doublon, remboursement en attente)..." />
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end space-x-2">
              <button onClick={() => setShowCancelModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md">Annuler</button>
              <button
                onClick={async () => {
                  try {
                    for (const id of selectedPaiements) {
                      try { echeancesManager.cancelPayment(id, cancelNote || undefined); } catch (err) { console.debug('cancel failed', err); }
                    }
                    showToast('Paiement(s) annulé(s)', 'success');
                    setSelectedPaiements([]);
                    setShowCancelModal(false);
                    setTimeout(() => { /* db dispatches dataChanged */ }, 600);
                  } catch (err) {
                    console.error(err);
                    showToast('Erreur lors de l\'annulation', 'error');
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >Confirmer l'annulation</button>
            </div>
          </div>
        </div>
      )}
      {/* Discard modal for unsaved changes */}
      {controller && (
        <DiscardModal
          open={controller.showPrompt}
          title="Quitter sans sauvegarder ?"
          description="Vous avez des modifications non sauvegardées. Voulez-vous quitter sans enregistrer ?"
          onConfirm={() => {
            try { clearDraft(); } catch (err) { /* ignore */ }
            const winAny: any = window as any;
            try { winAny.__preventReDispatch = true; } catch (e) { /* ignore */ }
            try {
              if ((controller as any).allowNavigation) (controller as any).allowNavigation(); else onBack();
            } finally {
              setTimeout(() => { try { winAny.__preventReDispatch = false; } catch (e) { /* ignore */ } }, 80);
            }
          }}
          onCancel={() => controller.closePrompt && controller.closePrompt()}
        />
      )}
    </div>
  );
}