import React, { useRef } from 'react';
import { useToast } from '../Layout/ToastProvider';
import { db } from '../../utils/database';

export default function ConfigBackup() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const JSZipModule = await import('jszip');
      const JSZip: any = JSZipModule && (JSZipModule.default || JSZipModule);
      const zip = new JSZip();
      const data = JSON.parse(db.exportData());
      const date = new Date().toISOString().split('T')[0];
      const dataFolder = zip.folder(`backup_${date}/data`);
      Object.entries(data).forEach(([collection, items]) => {
        dataFolder.file(`${collection}.json`, JSON.stringify(items, null, 2));
      });
      const metaFolder = zip.folder(`backup_${date}/meta`);
      metaFolder.file('info.json', JSON.stringify({ generatedAt: new Date().toISOString(), app: 'KlasNet' }, null, 2));
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a'); a.href = url; a.download = `klasnet_backup_${date}.zip`; a.click(); window.URL.revokeObjectURL(url);
      showToast('Sauvegarde ZIP exportée avec succès', 'success');
    } catch (err) {
      // fallback: single JSON file
      const data = db.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url; a.download = `klasnet_backup_${date}.json`; a.click(); window.URL.revokeObjectURL(url);
      showToast('Sauvegarde exportée (fallback JSON)', 'success');
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const success = db.importData(content);
  if (success) { showToast('Données importées avec succès', 'success'); /* db.importData dispatches dataChanged */ }
        else showToast('Erreur lors de l’importation des données', 'error');
      } catch (error) { showToast('Erreur lors de la lecture du fichier', 'error'); }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser toutes les données ? Cette action est irréversible.')) {
  db.resetData(); showToast('Données réinitialisées avec succès', 'success'); /* db.resetData dispatches dataChanged */ 
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Sauvegarde et Restauration</h2>
        <div className="text-sm text-gray-600">Export / import / réinitialisation des données de l'application</div>
      </div>

      <div className="max-w-xl bg-white p-6 rounded shadow-sm border">
        <p className="text-sm text-gray-700 mb-4">Utilisez ces commandes pour exporter une sauvegarde complète de l'application, importer une sauvegarde ou réinitialiser la base de données locale.</p>
        <div className="flex flex-col gap-3">
          <button onClick={handleExport} className="w-full px-4 py-2 bg-blue-600 text-white rounded">Exporter les données</button>
          <button onClick={() => fileInputRef.current?.click()} className="w-full px-4 py-2 border rounded">Importer des données</button>
          <button onClick={handleReset} className="w-full px-4 py-2 bg-red-600 text-white rounded">Réinitialiser toutes les données</button>
        </div>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
      </div>
    </div>
  );
}
