// React import not required with automatic JSX runtime
import { useState, useEffect } from 'react';
import { db } from '../../utils/database';
import { HistoriqueAction } from '../../types';

export default function HistoriqueList() {
  const [actions, setActions] = useState<HistoriqueAction[]>([]);

  useEffect(() => {
    setActions(db.getAll<HistoriqueAction>('historiques').sort((a, b) => b.date.localeCompare(a.date)));
  }, []);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl mx-auto">
      <h2 className="text-lg font-bold mb-4">Historique des actions</h2>
      {actions.length === 0 ? (
        <div className="text-gray-500 text-center">Aucune action enregistrée.</div>
      ) : (
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-50">
              <th className="border px-2 py-1">Date</th>
              <th className="border px-2 py-1">Type</th>
              <th className="border px-2 py-1">Cible</th>
              <th className="border px-2 py-1">Description</th>
              <th className="border px-2 py-1">Utilisateur</th>
            </tr>
          </thead>
          <tbody>
            {actions.map(action => (
              <tr key={action.id}>
                <td className="border px-2 py-1 whitespace-nowrap">{new Date(action.date).toLocaleString()}</td>
                <td className="border px-2 py-1 capitalize">{action.type}</td>
                <td className="border px-2 py-1">{action.cible}</td>
                <td className="border px-2 py-1">{action.description}</td>
                <td className="border px-2 py-1">{action.utilisateur || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
