import React from 'react';

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function DiscardModal({ open, title = 'Quitter sans sauvegarder ?', description = 'Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter et perdre vos changements ?', onConfirm, onCancel }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-2">{description}</p>
        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-100 text-gray-700">Retour</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-red-600 text-white">Quitter sans sauvegarder</button>
        </div>
      </div>
    </div>
  );
}
