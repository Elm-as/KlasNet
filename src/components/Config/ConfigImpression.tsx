import { useState } from 'react';
import { getAllEnteteConfig, saveEnteteConfig } from '../../utils/entetesConfig';
import type { AllConfigs } from '../../types/enteteConfig';
import EnteteFiche from '../EnteteFiche';

const readFileAsDataURL = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export default function ConfigImpression() {
  const [configs, setConfigs] = useState<AllConfigs>(() => getAllEnteteConfig());
  const [selected, setSelected] = useState<keyof AllConfigs>('eleves');

    function handleChange(section: keyof AllConfigs, field: keyof AllConfigs['eleves'], value: unknown) {
      setConfigs((prev: AllConfigs) => {
        const prevSection = prev[section] as unknown as Record<string, unknown>;
        return {
          ...prev,
          [section]: ({ ...prevSection, [field]: value } as unknown) as AllConfigs[keyof AllConfigs]
        };
      });
    }

  const handleSave = () => {
    saveEnteteConfig(configs);
    alert('Configurations d\'impression sauvegardées');
  };
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Configuration des impressions</h2>
      <p className="mb-6 text-sm text-gray-600 max-w-3xl">Éditez l'en-tête, le pied de page, les logos et les colonnes pour chaque type de document. Chaque onglet dispose d'un aperçu placé sous le formulaire.</p>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          {(['eleves','recu','transport'] as const).map(t => (
            <button
              key={t}
              onClick={() => setSelected(t)}
              className={`px-4 py-2 rounded-md font-semibold shadow-sm ${selected === t ? 'bg-teal-600 text-white' : 'bg-white border text-gray-700'}`}
            >
              {t === 'eleves' ? 'ÉLÈVES' : t === 'recu' ? 'REÇU' : 'TRANSPORT'}
            </button>
          ))}
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          {/* Formulaire compact et plus lisible */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Paramètres — {selected === 'eleves' ? 'Liste élèves' : selected === 'recu' ? 'Reçu de paiement' : 'Transport'}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">En-tête</label>
                <textarea rows={2} value={configs[selected].header} onChange={e => handleChange(selected, 'header', e.target.value)} className="w-full border rounded px-3 py-2 mt-1 resize-none" placeholder={selected === 'eleves' ? "Ministère de l'Éducation Nationale — Nom de l'établissement" : (selected === 'recu' ? 'Reçu de paiement' : 'Fiche de renseignement transport') } />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Pied de page</label>
                <textarea rows={2} value={configs[selected].footer || ''} onChange={e => handleChange(selected, 'footer', e.target.value)} className="w-full border rounded px-3 py-2 mt-1 resize-none" placeholder={selected === 'recu' ? "Aucun remboursement n'est possible après encaissement." : ''} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Colonnes (séparées par des virgules)</label>
                <input value={configs[selected].columns.join(', ')} onChange={e => handleChange(selected, 'columns', e.target.value.split(',').map(s => s.trim()))} className="w-full border rounded px-3 py-2 mt-1" placeholder={selected === 'eleves' ? 'Matricule, Nom & Prénom' : (selected === 'recu' ? 'Nom, Montant, Date, Classe' : 'Nom, Classe, Montant, Versement')} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Logo principal</label>
                <input type="file" accept="image/*" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return; const data = await readFileAsDataURL(f); handleChange(selected, 'logo', data);
                }} className="mt-1" />
                <div className="mt-2 text-sm text-gray-600">
                  {configs[selected].logo ? (
                    <div className="flex items-center gap-3">
                      <img src={configs[selected].logo} alt="logo" className="h-14" />
                      <button className="px-3 py-1 border rounded text-sm" onClick={() => handleChange(selected, 'logo', '')}>Supprimer</button>
                    </div>
                  ) : (
                    <div>Aucun fichier sélectionné</div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Logo Ministère</label>
                <input type="file" accept="image/*" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return; const data = await readFileAsDataURL(f); handleChange(selected, 'logoMinistere', data);
                }} className="mt-1" />
                <div className="mt-2 text-sm text-gray-600">
                  {configs[selected].logoMinistere ? (
                    <div className="flex items-center gap-3">
                      <img src={configs[selected].logoMinistere} alt="logo-min" className="h-14" />
                      <button className="px-3 py-1 border rounded text-sm" onClick={() => handleChange(selected, 'logoMinistere', '')}>Supprimer</button>
                    </div>
                  ) : (
                    <div>Aucun fichier sélectionné</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">Options</div>
              <div className="space-x-2">
                <button onClick={() => setConfigs(getAllEnteteConfig())} className="px-3 py-1 border rounded">Restaurer</button>
                <button onClick={handleSave} className="px-3 py-1 bg-teal-600 text-white rounded">Sauvegarder</button>
              </div>
            </div>
          </div>

          {/* Aperçu unique pour l'onglet sélectionné, placé sous le formulaire */}
          <div className="border-t pt-4">
            <div className="bg-gray-50 p-4 rounded">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Aperçu — {selected === 'eleves' ? 'Liste élèves' : selected === 'recu' ? 'Reçu' : 'Transport'}</h4>
                <div className="text-sm text-gray-500">{selected === 'eleves' ? 'Liste des élèves' : selected === 'recu' ? 'Reçu de paiement' : 'Fiche de renseignement transport'}</div>
              </div>

              <div className="border rounded bg-white p-4">
                <EnteteFiche type={selected} libelle={configs[selected].header} />

                <div className="mt-4 text-sm text-gray-700">
                  {selected === 'eleves' && (
                    <>
                      <div className="font-semibold">Ministère de l'Éducation Nationale et de l'Alphabétisation</div>
                      <div className="mt-1">GROUPE SCOLAIRE BAPTISTE MISSIONNAIRE DE KOUMASSI</div>
                      <div className="mt-3 font-medium">Liste des élèves</div>
                    </>
                  )}

                  {selected === 'recu' && (
                    <>
                      <div className="font-semibold">Reçu de paiement</div>
                      <div className="mt-2 text-gray-600">Aucun remboursement n'est possible après encaissement.</div>
                    </>
                  )}

                  {selected === 'transport' && (
                    <>
                      <div className="font-semibold">Fiche de renseignement transport</div>
                      <div className="mt-2 text-gray-600">Informations : nom, classe, montant, versement</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
