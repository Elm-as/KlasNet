import React, { useState } from 'react';
import { db } from '../../utils/database';
import { FraisScolaire, Classe } from '../../types';

// Nouvelle interface de configuration des frais par niveau
export default function ConfigFrais() {
  // Récupération des niveaux et classes
  const niveaux = [
    'Petite Section', 'Moyenne Section', 'Grande Section',
    'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'
  ];
  const anneeScolaire = new Date().getFullYear() + '-' + (new Date().getFullYear() + 1);
  const [selectedNiveau, setSelectedNiveau] = useState(niveaux[0]);
  const [frais, setFrais] = useState(() => {
    // On charge les frais existants ou on initialise
    const all = db.getAll<FraisScolaire>('fraisScolaires');
    const obj: Record<string, any> = {};
    niveaux.forEach(niv => {
      const exist = all.find(f => f.niveau === niv && f.anneeScolaire === anneeScolaire);
      obj[niv] = exist || {
        niveau: niv,
        anneeScolaire,
        fraisInscription: 0,
        echeances: [{ date: '', montant: 0 }],
      };
    });
    return obj;
  });
  const [editingFraisId, setEditingFraisId] = useState<string | null>(null);
  const [fraisList, setFraisList] = useState<FraisScolaire[]>(() => db.getAll<FraisScolaire>('fraisScolaires'));

  // Gestion édition frais d'inscription
  const handleFraisInscription = (val: number) => {
    setFrais(prev => ({
      ...prev,
      [selectedNiveau]: {
        ...prev[selectedNiveau],
        fraisInscription: val
      }
    }));
  };

  // Gestion édition échéances
  const handleEcheanceChange = (idx: number, field: 'date' | 'montant', value: string | number) => {
    setFrais(prev => {
      const echeances = [...prev[selectedNiveau].echeances];
      echeances[idx] = { ...echeances[idx], [field]: value };
      return {
        ...prev,
        [selectedNiveau]: {
          ...prev[selectedNiveau],
          echeances
        }
      };
    });
  };
  const handleAddEcheance = () => {
    setFrais(prev => ({
      ...prev,
      [selectedNiveau]: {
        ...prev[selectedNiveau],
        echeances: [...prev[selectedNiveau].echeances, { date: '', montant: 0 }]
      }
    }));
  };
  const handleRemoveEcheance = (idx: number) => {
    setFrais(prev => {
      const echeances = prev[selectedNiveau].echeances.filter((_: any, i: number) => i !== idx);
      return {
        ...prev,
        [selectedNiveau]: {
          ...prev[selectedNiveau],
          echeances
        }
      };
    });
  };

  // Sauvegarde en base
  const handleSave = () => {
    const data = frais[selectedNiveau];
    // Préparer payload
    const payload: any = {
      ...data,
      id: data.id || Date.now().toString(),
      niveau: selectedNiveau,
      anneeScolaire,
      echeances: data.echeances || [],
      fraisInscription: Number(data.fraisInscription || 0),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (editingFraisId) {
      db.update('fraisScolaires', editingFraisId, payload);
      setEditingFraisId(null);
      setFraisList(db.getAll<FraisScolaire>('fraisScolaires'));
    } else {
      // create only if not exists
      const exist = db.getAll<FraisScolaire>('fraisScolaires').find(f => f.niveau === selectedNiveau && f.anneeScolaire === anneeScolaire);
      if (exist) {
        db.update('fraisScolaires', exist.id, payload);
      } else {
        db.create('fraisScolaires', payload);
      }
      setFraisList(db.getAll<FraisScolaire>('fraisScolaires'));
    }
    // Mettre à jour l'état local pour refléter la DB
    setFrais(prev => ({ ...prev, [selectedNiveau]: payload }));
    alert('Frais enregistrés pour ' + selectedNiveau);
  };

  const handleEditClick = (existing: any) => {
    // préremplir l'état
    setEditingFraisId(existing.id);
    setFrais(prev => ({ ...prev, [existing.niveau]: { ...existing } }));
    setSelectedNiveau(existing.niveau);
    // scroll to top for visibility
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingFraisId(null);
    // reload from DB to discard changes
    const all = db.getAll<FraisScolaire>('fraisScolaires');
    const obj: Record<string, any> = {};
    niveaux.forEach(niv => {
      const exist = all.find(f => f.niveau === niv && f.anneeScolaire === anneeScolaire);
      obj[niv] = exist || {
        niveau: niv,
        anneeScolaire,
        fraisInscription: 0,
        echeances: [{ date: '', montant: 0 }],
      };
    });
    setFrais(obj);
  };

  // Calcul du montant total (inscription + échéances)
  const totalEcheances = frais[selectedNiveau].echeances.reduce((sum: number, ech: any) => sum + Number(ech.montant || 0), 0);
  const total = Number(frais[selectedNiveau].fraisInscription || 0) + totalEcheances;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Bandeau année scolaire active */}
      <div className="bg-teal-50 border-l-4 border-teal-600 p-4 rounded mb-2 flex items-center justify-between">
        <div className="text-teal-800 font-semibold">
          Année scolaire active : <span className="font-bold text-lg">{anneeScolaire}</span>
        </div>
        <div className="text-gray-500 text-sm">L'année scolaire active sera utilisée pour toutes les nouvelles saisies (élèves, classes, frais...)</div>
      </div>

      <h2 className="text-2xl font-bold mb-4 text-teal-700">Configuration des Frais Scolaires</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {niveaux.map(niv => (
          <button
            key={niv}
            className={`px-3 py-2 rounded shadow-sm border transition-all duration-150 ${selectedNiveau === niv ? 'bg-teal-600 text-white border-teal-700' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-teal-100'}`}
            onClick={() => setSelectedNiveau(niv)}
          >
            {niv}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-lg border p-6 space-y-8 shadow">
        <div className="flex flex-col md:flex-row md:items-center md:gap-8 gap-2">
          <div className="flex-1">
            <label className="font-semibold block mb-1">Frais d'inscription (obligatoire)</label>
            <input
              type="number"
              min={0}
              value={frais[selectedNiveau].fraisInscription}
              onChange={e => handleFraisInscription(Number(e.target.value))}
              className="px-3 py-2 border rounded w-full md:w-48 text-lg font-bold text-teal-700"
            />
          </div>
          <div className="flex-1 text-right">
            <div className="font-semibold text-gray-700">Montant total (inscription + scolarité) :</div>
            <div className="text-2xl font-bold text-teal-700">{total.toLocaleString()} FCFA</div>
          </div>
        </div>
        <div>
          <label className="font-semibold mb-2 block">Échéances de scolarité (versements)</label>
          <table className="w-full text-sm border mb-2">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-2 py-1">Date d'échéance</th>
                <th className="border px-2 py-1">Montant</th>
                <th className="border px-2 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {frais[selectedNiveau].echeances.map((ech: any, idx: number) => (
                <tr key={idx}>
                  <td className="border px-2 py-1">
                    <input type="date" value={ech.date} onChange={e => handleEcheanceChange(idx, 'date', e.target.value)} className="px-2 py-1 border rounded w-40" />
                  </td>
                  <td className="border px-2 py-1">
                    <input type="number" min={0} value={ech.montant} onChange={e => handleEcheanceChange(idx, 'montant', Number(e.target.value))} className="px-2 py-1 border rounded w-32 text-right" />
                  </td>
                  <td className="border px-2 py-1 text-center">
                    <button className="text-red-600 hover:underline" onClick={() => handleRemoveEcheance(idx)}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleAddEcheance}>Ajouter une échéance</button>
        </div>
        <div className="flex justify-end">
          <button className="px-4 py-2 bg-teal-600 text-white rounded font-bold" onClick={handleSave}>{editingFraisId ? 'Enregistrer' : 'Enregistrer'}</button>
          {editingFraisId && (
            <button className="ml-2 px-4 py-2 border rounded" onClick={handleCancel}>Annuler</button>
          )}
        </div>
      </div>
      <div className="mt-6 bg-white rounded-lg border p-4">
        <h3 className="font-semibold mb-2">Aperçu des frais enregistrés</h3>
  <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-50">
              <th className="border px-2 py-1">Niveau</th>
              <th className="border px-2 py-1">Année</th>
              <th className="border px-2 py-1 text-right">Total</th>
              <th className="border px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fraisList.map(f => (
              <tr key={f.id}>
                <td className="border px-2 py-1">{f.niveau}</td>
                <td className="border px-2 py-1">{f.anneeScolaire}</td>
                <td className="border px-2 py-1 text-right">{(() => {
                  const ff: any = f as any;
                  const sumE = Array.isArray(ff.echeances) ? ff.echeances.reduce((s: number, x: any) => s + Number(x.montant || 0), 0) : 0;
                  const ins = Number(ff.fraisInscription || 0);
                  return (ins + sumE).toLocaleString() + ' FCFA';
                })()}</td>
                <td className="border px-2 py-1 space-x-2">
                  <button className="px-2 py-1 bg-yellow-500 text-white rounded" onClick={() => handleEditClick(f)}>Éditer</button>
                  <button className="px-2 py-1 bg-red-600 text-white rounded" onClick={() => { db.delete('fraisScolaires', f.id); setFraisList(db.getAll<FraisScolaire>('fraisScolaires')); }}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
