import React, { useState, useMemo } from 'react';
import { db } from '../../utils/database';
import { Eleve, Paiement, FraisScolaire, Classe } from '../../types';
import EnteteFiche from '../EnteteFiche';
import PaymentForm from './PaymentForm';
import { useToast } from '../Layout/ToastProvider';
import { openPrintPreviewFromElementId } from '../../utils/printPreview';
import { getCurrentUser } from '../../utils/auth';
import { useDebounce } from '../../hooks/useDebounce';
import { TableSkeleton } from '../UI/SkeletonLoader';
import { AuditLogger } from '../Config/AuditLogView';

export default function FinancesList() {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [formMontant, setFormMontant] = React.useState('');
  const [formType, setFormType] = React.useState('scolarite');
  const [isLoading, setIsLoading] = React.useState(false);
  const eleves = db.getAll<Eleve>('eleves');
  const paiements = db.getAll<Paiement>('paiements');
  const fraisScolaires = db.getAll<FraisScolaire>('fraisScolaires');
  const classes = db.getAll<Classe>('classes');

  const [selectedClasse, setSelectedClasse] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredEleves = useMemo(() => {
    let filtered = eleves;
    if (selectedClasse) {
      filtered = filtered.filter(e => e.classeId === selectedClasse);
    }
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.nom.toLowerCase().includes(term) ||
        e.prenoms.toLowerCase().includes(term) ||
        e.matricule.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [eleves, selectedClasse, debouncedSearchTerm]);

  const [elevePaiement, setElevePaiement] = useState<string | null>(null);
  const [selectedModalite, setSelectedModalite] = useState<number | 'auto'>(1);
  const [showRecuPicker, setShowRecuPicker] = useState(false);
  const [selectedPaiementsIds, setSelectedPaiementsIds] = useState<string[]>([]);
  const { showToast } = useToast();

  // Écouteur global pour navigation depuis d'autres composants (ex: EleveForm)
  React.useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent;
      if (ev?.detail?.page === 'finances') {
        setElevePaiement(ev.detail.eleveId || null);
      }
    };
    window.addEventListener('navigate', handler as EventListener);
    return () => window.removeEventListener('navigate', handler as EventListener);
  }, []);

  // Memoize calculations for better performance
  const paiementsMap = useMemo(() => {
    const map = new Map<string, Paiement[]>();
    paiements.forEach(p => {
      const existing = map.get(p.eleveId) || [];
      map.set(p.eleveId, [...existing, p]);
    });
    return map;
  }, [paiements]);

  const fraisMap = useMemo(() => {
    const map = new Map<string, FraisScolaire>();
    fraisScolaires.forEach(f => {
      map.set(`${f.niveau}_${f.anneeScolaire}`, f);
    });
    return map;
  }, [fraisScolaires]);

  // Situation financière calculation removed: we display explicit inscription and versements columns instead

  const getSommeParType = (eleveId: string, type?: string) => {
    const paiementsEleve = paiementsMap.get(eleveId) ?? [];
    if (type) {
      return paiementsEleve.filter(p => (p as any).typeFrais === type).reduce((s, p) => s + (p.montant || 0), 0);
    }
    return paiementsEleve.reduce((s, p) => s + (p.montant || 0), 0);
  };

  const getSommeVersementIndex = (eleveId: string, idx: number) => {
  return getSommeParModalite(eleveId, idx);
  };

  const getTotalPaye = (eleveId: string) => getSommeParType(eleveId);

  // helper: optionally read frais inscription directly from fraisScolaires when needed

  const getInscriptionValue = (eleve: Eleve) => {
    // Show amount actually paid for inscription (paiements de type 'inscription')
    return getSommeParType(eleve.id, 'inscription');
  };

  function getFraisForEleve(eleve: Eleve) {
    const classe = classes.find(c => c.id === eleve.classeId);
    if (!classe) return null;
    const frais = fraisMap.get(`${classe.niveau}_${classe.anneeScolaire}`);
    return frais || null;
  }

  function getSommeParModalite(eleveId: string, modaliteIdx: number) {
    // For modalite 1 we must include explicit 'scolarite' versements with versementIndex=1
    // as well as any payments recorded as type 'inscription'
    const paiementsEleve = paiementsMap.get(eleveId) ?? [];
    if (Number(modaliteIdx) === 1) {
      const sommeInscription = paiementsEleve.filter(p => (p as any).typeFrais === 'inscription').reduce((s, p) => s + (p.montant || 0), 0);
      const sommeVersement1 = paiementsEleve.filter(p => (p as any).typeFrais === 'scolarite' && Number((p as any).versementIndex) === 1).reduce((s, p) => s + (p.montant || 0), 0);
      return (sommeInscription + sommeVersement1) || 0;
    }
    const scolaritePaiements = paiementsEleve.filter(p => (p as any).typeFrais === 'scolarite');
    // Somme des paiements explicitement rattachés à la modalité
    const explicites = scolaritePaiements.filter(p => Number((p as any).versementIndex) === Number(modaliteIdx)).reduce((s, p) => s + (p.montant || 0), 0);
    return explicites || 0;
  }

  // Allouer un paiement automatiquement aux échéances non réglées pour un élève
  function allocatePaymentToEcheances(eleveId: string, montant: number) {
    const ele = eleves.find(e => e.id === eleveId);
    if (!ele) return;
    const frais = getFraisForEleve(ele);
    if (!frais || !(frais as any).echeances || (frais as any).echeances.length === 0) {
      // Pas d'échéances connues : créer paiement libre
      const numero = 'REC' + Date.now().toString().slice(-8);
      db.create<Paiement>('paiements', { eleveId, montant, typeFrais: 'scolarite', datePaiement: new Date().toISOString(), numeroRecu: numero, modePaiement: 'Espèces', createdAt: new Date().toISOString() } as any);
      
      // Log the payment
      const currentUser = getCurrentUser();
      AuditLogger.log({
        type: 'payment',
        action: `Paiement de ${montant} FCFA enregistré pour ${ele.nom} ${ele.prenoms}`,
        user: currentUser ? `${currentUser.prenoms} ${currentUser.nom}` : 'Inconnu',
        details: { eleveId, montant, type: 'scolarite', numeroRecu: numero },
        status: 'success',
      });
      return;
    }

    let remaining = Number(montant || 0);
  const echeances: any[] = ((frais as any).echeances || []).slice().sort((a: any, b: any) => (a.modalite || 0) - (b.modalite || 0));
    const paiementsCreated: any[] = [];
    for (const e of echeances) {
      if (remaining <= 0) break;
      const modalite = Number(e.modalite || 0);
      const expected = Number(e.montant || 0);
      const already = getSommeParModalite(eleveId, modalite) || 0;
      const due = Math.max(0, expected - already);
      if (due <= 0) continue;
      const alloc = Math.min(remaining, due);
      const numero = 'REC' + Date.now().toString().slice(-8) + '-' + modalite;
      if (modalite === 1) {
        db.create<Paiement>('paiements', { eleveId, montant: alloc, typeFrais: 'inscription', datePaiement: new Date().toISOString(), numeroRecu: numero, modePaiement: 'Espèces', createdAt: new Date().toISOString() } as any);
      } else {
        db.create<Paiement>('paiements', { eleveId, montant: alloc, typeFrais: 'scolarite', versementIndex: modalite, datePaiement: new Date().toISOString(), numeroRecu: numero, modePaiement: 'Espèces', createdAt: new Date().toISOString() } as any);
      }
      paiementsCreated.push({ modalite, montant: alloc, numero });
      remaining -= alloc;
    }

    if (remaining > 0) {
      // Surplus : créer paiement non rattaché
      const numero = 'REC' + Date.now().toString().slice(-8) + '-SUR';
      db.create<Paiement>('paiements', { eleveId, montant: remaining, typeFrais: 'scolarite', datePaiement: new Date().toISOString(), numeroRecu: numero, modePaiement: 'Espèces', createdAt: new Date().toISOString() } as any);
      paiementsCreated.push({ type: 'surplus', montant: remaining, numero });
    }

    // Log the payment allocation
    const currentUser = getCurrentUser();
    AuditLogger.log({
      type: 'payment',
      action: `Paiement de ${montant} FCFA alloué automatiquement pour ${ele.nom} ${ele.prenoms}`,
      user: currentUser ? `${currentUser.prenoms} ${currentUser.nom}` : 'Inconnu',
      details: { eleveId, montantTotal: montant, allocations: paiementsCreated },
      status: 'success',
    });
  }

  // Supprimer les paiements historiques de montant 0 pour un élève
  function cleanupZeroPayments(eleveId: string) {
    const elevePayments = paiementsMap.get(eleveId) ?? [];
    const zeros = elevePayments.filter(p => Number((p as any).montant || 0) === 0);
    if (!zeros.length) {
      showToast('Aucun paiement à 0 FCFA trouvé', 'info');
      return;
    }
    zeros.forEach(z => {
      try {
        db.delete('paiements', (z as any).id);
      } catch (err) {
        // ignore individual errors
      }
    });
    
    const ele = eleves.find(e => e.id === eleveId);
    const currentUser = getCurrentUser();
    AuditLogger.log({
      type: 'delete',
      action: `${zeros.length} paiement(s) à 0 FCFA supprimé(s) pour ${ele?.nom} ${ele?.prenoms}`,
      user: currentUser ? `${currentUser.prenoms} ${currentUser.nom}` : 'Inconnu',
      details: { eleveId, count: zeros.length },
      status: 'success',
    });
    
    showToast(`${zeros.length} paiement(s) à 0 FCFA supprimé(s)`, 'success');
    setRefreshKey(k => k + 1);
  }

  function handleReglerEcheance(modalite: number, reste: number) {
    // Pré-sélectionne la modalité et le montant restant
    setSelectedModalite(modalite);
    setFormMontant(String(reste));
    setFormType('scolarite');
    showToast(`Modalité ${modalite} sélectionnée (${reste.toLocaleString('fr-FR')} FCFA)`, 'info');
  }

  return (
    <div>
      {/* force-read refreshKey to avoid unused variable lint */}
      <span className="hidden">{refreshKey}</span>
    <div className="mt-2 flex items-center justify-between">
        <div>
      <button className="px-3 py-1 bg-teal-600 text-white rounded" onClick={() => {
            setSelectedPaiementsIds([]);
            setShowRecuPicker(true);
          }}>Aperçu reçus</button>
      <button className="ml-3 px-3 py-1 bg-green-600 text-white rounded" onClick={() => setShowPaymentModal(true)}>Nouveau paiement</button>
          <button className="ml-3 bg-yellow-600 text-white px-4 py-2 rounded" onClick={async () => {
            // Imprimer convocations: collect unpaid échéances for all élèves filtrés
            try {
              const containerId = `convocations-print-${Date.now()}`;
              const div = document.createElement('div'); div.id = containerId; document.body.appendChild(div);
              // build convocations data
              const convocations: Array<{ ele: Eleve; echeances: any[]; totalDue: number } > = [];
              for (const ele of filteredEleves) {
                const frais = getFraisForEleve(ele) as any;
                if (!frais || !(frais.echeances || []).length) continue;
                const unpaid: any[] = [];
                let totalDue = 0;
                for (const ech of (frais.echeances || [])) {
                  const modal = Number(ech.modalite || 0);
                  const attendu = Number(ech.montant || 0);
                  const paye = getSommeParModalite(ele.id, modal);
                  const reste = Math.max(0, attendu - paye);
                  if (reste > 0) {
                    unpaid.push({ modalite: modal, attendu, paye, reste, date: ech.date });
                    totalDue += reste;
                  }
                }
                if (unpaid.length) convocations.push({ ele, echeances: unpaid, totalDue });
              }

              if (!convocations.length) {
                showToast('Aucune convocation à imprimer', 'info');
                div.remove();
                return;
              }

              // dynamic import Convocation and react-dom client
              const [{ default: Conv }] = await Promise.all([import('./Convocation')]);
              const { createRoot } = await import('react-dom/client');
              // render each convocation
              convocations.forEach((c) => {
                const mount = document.createElement('div'); div.appendChild(mount);
                const root = (createRoot as any)(mount);
                const classeObj = classes.find(cl => cl.id === c.ele.classeId)!;
                root.render(React.createElement(Conv, {
                  eleve: c.ele,
                  echeances: c.echeances,
                  totalDue: c.totalDue,
                  classe: classeObj,
                  anneeScolaire: (classeObj as any)?.anneeScolaire || ''
                }));
              });

              // All convocations rendered — open preview
              setTimeout(() => {
                openPrintPreviewFromElementId(containerId, 'Convocations de paiement');
                setTimeout(() => { const d = document.getElementById(containerId); if (d) d.remove(); }, 2000);
              }, 200);
            } catch (err) {
              showToast('Erreur lors de la génération des convocations', 'error');
              console.error(err);
            }
          }}>Imprimer convocations</button>
        </div>
        <h2 className="text-xl font-bold mb-4">Gestion des Finances</h2>
      </div>
      <div className="flex space-x-4 mb-4">
        <select value={selectedClasse} onChange={e => setSelectedClasse(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Toutes les classes</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.niveau} {c.section}</option>
          ))}
        </select>
        <input type="text" placeholder="Recherche élève..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border rounded px-2 py-1" />
      </div>

      {/* Gestion financière par élève : ouvert en cliquant sur le nom */}
      {/* Modal d'édition financière */}
      {elevePaiement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Gestion financière - { (eleves.find(e => e.id === elevePaiement) as any)?.nom }</h3>
              <div className="flex items-center gap-2">
                <button className="text-sm px-2 py-1 bg-gray-100 rounded" onClick={() => cleanupZeroPayments(elevePaiement!)}>Nettoyer 0 FCFA</button>
                <button className="text-gray-500" onClick={() => setElevePaiement(null)}>✕</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm">Statut</label>
                <select value={ ((eleves.find(e => e.id === elevePaiement) as any)?.statutInscription) || 'non-inscrit' } onChange={(e) => {
                  const newStatus = e.target.value;
                  const ele = eleves.find(x => x.id === elevePaiement);
                  if (!ele) return;
                  db.update<Eleve>('eleves', ele.id, { ...(ele as any), statutInscription: newStatus });
                  // si on passe à inscrit, créer paiement d'inscription au montant du niveau
                  if (newStatus === 'inscrit') {
                    const classe = classes.find(c => c.id === ele.classeId);
                    const frais = fraisScolaires.find(f => f.niveau === classe?.niveau && f.anneeScolaire === classe?.anneeScolaire);
                    const montantInscription = frais ? ((frais as any).fraisInscription || 0) : 0;
                    // éviter création de paiement à 0 : ne créer que si montant connu > 0
                    if (montantInscription > 0) {
                      // éviter doublons : vérifier s'il existe déjà un paiement d'inscription non nul
                      const deja = paiements.find(p => p.eleveId === ele.id && ((p as any).typeFrais === 'inscription' || (p as any).typeFrais === 'inscription'));
                      if (!deja) {
                        db.create<Paiement>('paiements', {
                          eleveId: ele.id,
                          montant: montantInscription,
                          typeFrais: 'inscription',
                          numeroRecu: 'REC' + Date.now().toString().slice(-8),
                          datePaiement: new Date().toISOString(),
                          modePaiement: 'Espèces',
                          createdAt: new Date().toISOString(),
                        } as any);
                      } else if (deja && Number((deja as any).montant || 0) === 0) {
                        // si paiement d'inscription existant mais à 0, on met à jour avec le vrai montant
                        db.update<Paiement>('paiements', (deja as any).id, { ...(deja as any), montant: montantInscription, updatedAt: new Date().toISOString() } as any);
                      }
                    }
                    setRefreshKey(k => k + 1);
                  }
                  // feedback
                  showToast('Statut mis à jour', 'success');
                  setRefreshKey(k => k + 1);
                }} className="border rounded px-2 py-1 w-full">
                  <option value="non-inscrit">Non-inscrit</option>
                  <option value="inscrit">Inscrit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm">Enregistrer un versement</label>
                <div className="mt-2 flex gap-2">
                  <input placeholder="Montant" type="number" value={formMontant} onChange={e => setFormMontant(e.target.value)} className="border px-2 py-1 rounded w-1/2" />
                  <select value={formType} onChange={e => setFormType(e.target.value)} className="border px-2 py-1 rounded w-1/2">
                    <option value="scolarite">Scolarité (V)</option>
                    <option value="inscription">Inscription</option>
                    <option value="cantine">Cantine</option>
                  </select>
                </div>
                <div className="mt-2 flex gap-2 items-center">
                  <div className="text-sm">Modalité:</div>
                  <select value={selectedModalite} onChange={e => setSelectedModalite(e.target.value === 'auto' ? 'auto' : Number(e.target.value))} className="border px-2 py-1 rounded w-40">
                    <option value="auto">Auto</option>
                    <option value={1}>1 - V1</option>
                    <option value={2}>2 - V2</option>
                    <option value={3}>3 - V3</option>
                    <option value={4}>4 - V4</option>
                    <option value={5}>5 - V5</option>
                    <option value={6}>6 - V6</option>
                    <option value={7}>7 - V7</option>
                  </select>
                </div>
                <div className="mt-2 flex gap-2">
                  <button className="px-3 py-1 bg-teal-600 text-white rounded" onClick={() => {
                    const montant = Number(formMontant || 0);
                    const type = formType || 'scolarite';
                    if (!montant || !elevePaiement) { showToast('Montant invalide', 'error'); return; }
                    const numero = 'REC' + Date.now().toString().slice(-8);
                    const paiementPayload: any = {
                      eleveId: elevePaiement,
                      montant,
                      typeFrais: type,
                      datePaiement: new Date().toISOString(),
                      numeroRecu: numero,
                      modePaiement: 'Espèces',
                      createdAt: new Date().toISOString()
                    };
                    if (type === 'scolarite') {
                      if (selectedModalite === 'auto') {
                        // répartir automatiquement si montant > 0
                        if (montant > 0) {
                          allocatePaymentToEcheances(elevePaiement, montant);
                        } else {
                          showToast('Montant invalide pour allocation automatique', 'error');
                        }
                      } else {
                        if (montant > 0) {
                          const modal = Number(selectedModalite);
                          if (modal === 1) {
                            // Treat modalite 1 as inscription (store as type 'inscription')
                            const payload = { ...paiementPayload, typeFrais: 'inscription' } as any;
                            db.create<Paiement>('paiements', payload);
                          } else {
                            paiementPayload.versementIndex = modal;
                            db.create<Paiement>('paiements', paiementPayload as any);
                          }
                        } else {
                          showToast('Montant invalide', 'error');
                        }
                      }
                    } else {
                      if (montant > 0) db.create<Paiement>('paiements', paiementPayload as any);
                      else showToast('Montant invalide', 'error');
                    }
                    showToast('Versement enregistré', 'success');
                    setFormMontant('');
                    setFormType('scolarite');
                    setRefreshKey(k => k + 1);
                  }}>Enregistrer</button>
                </div>
              </div>
              <div>
                <label className="block text-sm">Imprimer reçus</label>
                  <div className="mt-2">
                    <button className="px-3 py-1 bg-teal-600 text-white rounded" onClick={async () => {
                      // Render RecuPaiement components into a temporary container for faithful preview
                      if (!elevePaiement) return;
                      const paiementsEleve = paiements.filter(p => p.eleveId === elevePaiement);
                      if (!paiementsEleve.length) { showToast('Aucun paiement pour cet élève', 'info'); return; }
                      const containerId = `print-area-eleve-${elevePaiement}-${Date.now()}`;
                      const div = document.createElement('div');
                      div.id = containerId;
                      document.body.appendChild(div);

                      // Import once and render all receipts synchronously so the content exists when opening preview
                      const [{ createRoot }, { default: Recu }] = await Promise.all([import('react-dom/client'), import('./RecuPaiement')]);
                      const ele = eleves.find(e => e.id === elevePaiement)!;
                      paiementsEleve.forEach((p, i) => {
                        const mount = document.createElement('div');
                        mount.id = `${containerId}-${i}`;
                        div.appendChild(mount);
                        const root = (createRoot as any)(mount);
                          root.render(React.createElement(Recu, {
                          eleve: { nom: ele.nom, prenoms: ele.prenoms, matricule: ele.matricule, classe: (classes.find(c => c.id === ele.classeId) as any)?.niveau || '' },
                          montantRegle: (p as any).montant || 0,
                          date: (p as any).datePaiement || new Date().toISOString(),
                          mode: (p as any).modePaiement || 'Espèces',
                          cumulReglement: getTotalPaye(elevePaiement),
                          resteAPayer: 0,
                          anneeScolaire: (classes.find(c => c.id === ele.classeId) as any)?.anneeScolaire || '',
                          operateur: (getCurrentUser() ? `${getCurrentUser()!.prenoms} ${getCurrentUser()!.nom}` : 'Inconnu'),
                          numeroRecu: (p as any).numeroRecu || ('REC' + Date.now().toString().slice(-8)),
                          printMode: true
                        }));
                      });

                      // slight delay to ensure React paints, then open preview
                      setTimeout(() => {
                        openPrintPreviewFromElementId(containerId, `Reçus ${elevePaiement}`);
                        setTimeout(() => { const d = document.getElementById(containerId); if (d) d.remove(); }, 2000);
                      }, 150);
                    }}>Aperçu reçus</button>
                  </div>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="font-semibold">Historique des paiements</h4>
              <div className="max-h-48 overflow-auto mt-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">Date</th>
                      <th className="border px-2 py-1">Montant</th>
                      <th className="border px-2 py-1">Type</th>
                      <th className="border px-2 py-1">Reçu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paiements.filter(p => p.eleveId === elevePaiement).map(p => (
                      <tr key={(p as any).id}>
                        <td className="border px-2 py-1">{new Date((p as any).datePaiement || (p as any).date || '').toLocaleDateString('fr-FR')}</td>
                        <td className="border px-2 py-1">{(p as any).montant} FCFA</td>
                        <td className="border px-2 py-1">{(p as any).typeFrais}</td>
                        <td className="border px-2 py-1">{(p as any).numeroRecu || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="font-semibold">Échéances & Statut</h4>
              <div className="max-h-40 overflow-auto mt-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">Modalité</th>
                      <th className="border px-2 py-1">Date</th>
                      <th className="border px-2 py-1">Attendu</th>
                      <th className="border px-2 py-1">Payé</th>
                      <th className="border px-2 py-1">Reste</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const ele = eleves.find(e => e.id === elevePaiement);
                      if (!ele) return null;
                      const frais = getFraisForEleve(ele) as any;
                      if (!frais || !(frais.echeances || []).length) return <tr><td colSpan={5} className="text-gray-500 text-center py-2">Aucune échéance configurée</td></tr>;
                      return (frais.echeances || []).map((ech: any) => {
                        const modal = Number(ech.modalite || 0);
                        const attendu = Number(ech.montant || 0);
                        const paye = getSommeParModalite(elevePaiement!, modal);
                        const reste = Math.max(0, attendu - paye);
                        const status = reste === 0 ? 'paid' : (paye > 0 ? 'partial' : 'unpaid');
                        const statusColor = status === 'paid' ? 'bg-green-100 text-green-800' : (status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700');
                        return (
                          <tr key={modal}>
                            <td className="border px-2 py-1">{modal}</td>
                            <td className="border px-2 py-1">{ech.date}</td>
                            <td className="border px-2 py-1">{attendu.toLocaleString('fr-FR')} FCFA</td>
                            <td className="border px-2 py-1">{paye.toLocaleString('fr-FR')} FCFA</td>
                            <td className="border px-2 py-1 flex items-center justify-between">
                              <span>{reste.toLocaleString('fr-FR')} FCFA</span>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-xs ${statusColor}`}>{status === 'paid' ? 'Payé' : (status === 'partial' ? 'Partiel' : 'Non payé')}</span>
                                <button className="text-sm px-2 py-1 bg-blue-600 text-white rounded" onClick={() => handleReglerEcheance(modal, reste)}>Régler</button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Modal sélecteur de reçus */}
      {showRecuPicker && elevePaiement && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold mb-3">Sélectionner les reçus à imprimer</h3>
                  <div className="text-sm text-gray-600 mb-2">Choisissez une ou plusieurs opérations (cocher). Vous pouvez imprimer séparément ou combiner les paiements sélectionnés en un seul reçu.</div>
                  <div className="max-h-64 overflow-auto border rounded p-2 mb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="px-2 py-1"> <input type="checkbox" onChange={e=>{
                            const list = paiements.filter(p=>p.eleveId===elevePaiement).map(p=>(p as any).id);
                            setSelectedPaiementsIds(e.target.checked ? list : []);
                          }} checked={selectedPaiementsIds.length>0 && selectedPaiementsIds.length===paiements.filter(p=>p.eleveId===elevePaiement).length} /></th>
                          <th className="px-2 py-1">Date</th>
                          <th className="px-2 py-1">Montant</th>
                          <th className="px-2 py-1">Type</th>
                          <th className="px-2 py-1">Reçu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paiements.filter(p => p.eleveId === elevePaiement).map(p => {
                          const id = (p as any).id;
                          return (
                            <tr key={id} className="hover:bg-gray-50">
                              <td className="px-2 py-1 text-center"><input type="checkbox" checked={selectedPaiementsIds.includes(id)} onChange={e=>{
                                setSelectedPaiementsIds(prev => e.target.checked ? [...prev, id] : prev.filter(x=>x!==id));
                              }} /></td>
                              <td className="px-2 py-1">{new Date((p as any).datePaiement || (p as any).date || '').toLocaleDateString('fr')}</td>
                              <td className="px-2 py-1">{(p as any).montant} FCFA</td>
                              <td className="px-2 py-1">{(p as any).typeFrais}</td>
                              <td className="px-2 py-1">{(p as any).numeroRecu || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button className="px-3 py-1 bg-gray-300 rounded" onClick={()=>{ setShowRecuPicker(false); setSelectedPaiementsIds([]); }}>Annuler</button>
                    <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={async ()=>{
                      // imprimer séparé: chaque paiement comme reçu
                      if (!elevePaiement) return;
                      const toPrint = paiements.filter(p=>selectedPaiementsIds.includes((p as any).id));
                      if (toPrint.length===0) { showToast('Sélectionnez au moins une opération', 'error'); return; }
                      const containerId = `print-area-eleve-${elevePaiement}-${Date.now()}`;
                      const div = document.createElement('div'); div.id = containerId; document.body.appendChild(div);
                      const [{ createRoot }, { default: Recu }, { default: Combined }] = await Promise.all([import('react-dom/client'), import('./RecuPaiement'), import('./CombinedRecu')]);
                      const ele = eleves.find(e => e.id === elevePaiement)!;
                      if (selectedPaiementsIds.length === 1) {
                        // single paiement -> render single Recu
                        const p = toPrint[0];
                        const mount = document.createElement('div'); div.appendChild(mount);
                        const root = (createRoot as any)(mount);
                        root.render(React.createElement(Recu, {
                          eleve: { nom: ele.nom, prenoms: ele.prenoms, matricule: ele.matricule, classe: (classes.find(c => c.id === ele.classeId) as any)?.niveau || '' },
                          montantRegle: (p as any).montant || 0,
                          date: (p as any).datePaiement || new Date().toISOString(),
                          mode: (p as any).modePaiement || 'Espèces',
                          cumulReglement: getTotalPaye(elevePaiement),
                          resteAPayer: 0,
                          anneeScolaire: (classes.find(c => c.id === ele.classeId) as any)?.anneeScolaire || '',
                          operateur: (getCurrentUser() ? `${getCurrentUser()!.prenoms} ${getCurrentUser()!.nom}` : 'Inconnu'),
                          numeroRecu: (p as any).numeroRecu || ('REC' + Date.now().toString().slice(-8)),
                          printMode: true
                        }));
                      } else {
                        // multiple -> render combined recu
                        const mount = document.createElement('div'); div.appendChild(mount);
                        const root = (createRoot as any)(mount);
                        root.render(React.createElement(Combined, {
                          eleve: ele,
                          paiements: toPrint,
                          classe: classes.find(c => c.id === ele.classeId),
                          anneeScolaire: (classes.find(c => c.id === ele.classeId) as any)?.anneeScolaire || ''
                        }));
                      }
                      setShowRecuPicker(false);
                      setTimeout(()=>{ openPrintPreviewFromElementId(containerId, `Reçus ${elevePaiement}`); setTimeout(()=>{ const d=document.getElementById(containerId); if (d) d.remove(); },2000); }, 200);
                    }}>Imprimer sélection</button>
                </div>
              </div>
            </div>
      )}

      {showPaymentModal && (
        <PaymentForm onCancel={() => setShowPaymentModal(false)} onSubmit={(eleveId, montant, type, modalite) => {
          // use existing allocation logic when scolarite + auto
          if (type === 'scolarite' && modalite === 'auto') {
            allocatePaymentToEcheances(eleveId, montant);
          } else {
            const numero = 'REC' + Date.now().toString().slice(-8);
            const payload: any = { eleveId, montant, typeFrais: type, datePaiement: new Date().toISOString(), numeroRecu: numero, modePaiement: 'Espèces', createdAt: new Date().toISOString() };
            if (type === 'scolarite' && modalite !== 'auto') payload.versementIndex = modalite;
            if (type === 'inscription') payload.typeFrais = 'inscription';
            db.create('paiements', payload as any);
          }
          setShowPaymentModal(false);
          setRefreshKey(k => k + 1);
        }} />
      )}

      {/* Zone imprimable */}
      <div id="print-area" className="hidden print:block bg-white p-4 mb-4 print-compact">
        <EnteteFiche type="recu" libelle="Relevé des paiements" />
      </div>
    </div>
  );
}
