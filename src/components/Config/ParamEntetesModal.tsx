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

export default function ParamEntetesModal({ onClose }: { onClose: () => void }) {
  const [configs, setConfigs] = useState<AllConfigs>(() => getAllEnteteConfig());
  const [selected, setSelected] = useState<keyof AllConfigs>('eleves');

  function save(newConfigs: AllConfigs) {
    setConfigs(newConfigs);
    saveEnteteConfig(newConfigs);
  }

  function handleChange(field: keyof AllConfigs['eleves'], value: any) {
    const newConfigs = { ...configs, [selected]: { ...(configs as any)[selected], [field]: value } } as AllConfigs;
    save(newConfigs);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Paramétrage des entêtes</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1 border rounded" onClick={() => { setConfigs(getAllEnteteConfig()); }}>Restaurer</button>
            <button className="px-3 py-1" onClick={onClose}>Fermer</button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3">
            <nav className="flex flex-col gap-2">
              <button className={`text-left px-3 py-2 rounded ${selected === 'eleves' ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'}`} onClick={() => setSelected('eleves')}>Élèves</button>
              <button className={`text-left px-3 py-2 rounded ${selected === 'recu' ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'}`} onClick={() => setSelected('recu')}>Reçu</button>
              <button className={`text-left px-3 py-2 rounded ${selected === 'transport' ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50'}`} onClick={() => setSelected('transport')}>Transport</button>
            </nav>
          </div>

          <div className="col-span-6 bg-gray-50 p-3 rounded">
            <label className="block text-sm text-gray-700">Entête</label>
            <input className="w-full mt-1 p-2 border rounded" value={(configs[selected] as any).header} onChange={e => handleChange('header', e.target.value)} />

            <label className="block text-sm text-gray-700 mt-3">Pied de page</label>
            <input className="w-full mt-1 p-2 border rounded" value={(configs[selected] as any).footer || ''} onChange={e => handleChange('footer', e.target.value)} />

            <label className="block text-sm text-gray-700 mt-3">Colonnes (séparées par une virgule)</label>
            <input className="w-full mt-1 p-2 border rounded" value={(configs[selected] as any).columns.join(', ')} onChange={e => handleChange('columns', (e.target.value as string).split(',').map(s => s.trim()))} />

            <div className="mt-3">
              <label className="block text-sm text-gray-700">Logo principal</label>
              <input type="file" accept="image/*" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return; try { const data = await readFileAsDataURL(f); handleChange('logo', data); } catch (_){ }
              }} />
              { (configs[selected] as any).logo ? <img src={(configs[selected] as any).logo} alt="logo" className="h-12 mt-2" /> : null }
            </div>

            <div className="mt-3">
              <label className="block text-sm text-gray-700">Logo Ministère</label>
              <input type="file" accept="image/*" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return; try { const data = await readFileAsDataURL(f); handleChange('logoMinistere', data); } catch (_){ }
              }} />
              { (configs[selected] as any).logoMinistere ? <img src={(configs[selected] as any).logoMinistere} alt="logo-min" className="h-12 mt-2" /> : null }
            </div>
          </div>

          <div className="col-span-3">
            <h4 className="font-semibold mb-2">Aperçu</h4>
            <div className="border p-3 bg-white rounded">
              <EnteteFiche type={selected} libelle={(configs[selected] as any).header} />
            </div>
            <div className="mt-3 flex justify-end">
              <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => { save(configs); onClose(); }}>Enregistrer</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
