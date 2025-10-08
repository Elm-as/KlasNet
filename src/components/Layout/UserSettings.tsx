import { useState } from 'react';
import auth from '../../utils/auth';

export default function UserSettings() {
  const current = auth.getCurrentUser();
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [checkPwdForRename, setCheckPwdForRename] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return setStatus('Aucun utilisateur connecté.');
    if (!newPwd || newPwd !== confirm) return setStatus('Les nouveaux mots de passe ne correspondent pas.');

    // Use the new auth.changePassword signature which can verify the old password.
    const ok = auth.changePassword(current.nomUtilisateur, newPwd, oldPwd || undefined);
    setStatus(ok ? 'Mot de passe mis à jour.' : "Échec : l'ancien mot de passe est incorrect ou une erreur est survenue.");
    if (ok) {
      setOldPwd(''); setNewPwd(''); setConfirm('');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow">
      <h2 className="text-lg font-bold mb-4">Paramètres du compte</h2>
      <form onSubmit={onSubmit} className="space-y-4 text-sm text-gray-700">
        <div>
          <label className="block text-xs text-gray-500">Nom d'utilisateur</label>
          <div className="font-semibold">{current?.nomUtilisateur || '—'}</div>
        </div>

        <div>
          <label className="block text-xs text-gray-500">Ancien mot de passe</label>
          <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} className="mt-1 block w-full border rounded px-2 py-1" />
        </div>

        <div>
          <label className="block text-xs text-gray-500">Nouveau mot de passe</label>
          <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="mt-1 block w-full border rounded px-2 py-1" />
        </div>

        <div>
          <label className="block text-xs text-gray-500">Confirmer nouveau mot de passe</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-1 block w-full border rounded px-2 py-1" />
        </div>

        <div>
          <button type="submit" className="px-3 py-1 bg-teal-600 text-white rounded">Enregistrer</button>
        </div>
        {status && <div className="text-sm text-gray-600">{status}</div>}
      </form>

      <div className="mt-6 p-4 border-t pt-4">
        <h3 className="text-sm font-semibold mb-2">Changer le nom d'utilisateur</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div>
            <label className="block text-xs text-gray-500">Nouveau nom d'utilisateur</label>
            <input value={newUsername} onChange={e => setNewUsername(e.target.value)} className="mt-1 block w-full border rounded px-2 py-1" />
          </div>

          <div>
            <label className="block text-xs text-gray-500">Mot de passe (vérification)</label>
            <input type="password" value={checkPwdForRename} onChange={e => setCheckPwdForRename(e.target.value)} className="mt-1 block w-full border rounded px-2 py-1" />
          </div>

          <div>
              <button onClick={() => {
                setStatus(null);
                if (!current) return setStatus('Aucun utilisateur connecté.');
                if (!newUsername) return setStatus("Entrez un nouveau nom d'utilisateur.");
                // Validation simple : 3-30 caractères alphanumériques, underscore, point ou tiret
                const okFormat = /^[a-z0-9_.-]{3,30}$/i.test(newUsername);
                if (!okFormat) return setStatus('Nom utilisateur invalide — utilisez 3 à 30 caractères (lettres, chiffres, _, . ou -).');
                // show confirmation modal
                setShowConfirm(true);
              }} className="px-3 py-1 bg-blue-600 text-white rounded">Renommer le compte</button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow max-w-md w-full">
            <h4 className="font-semibold mb-3">Confirmer le renommage</h4>
            <p className="text-sm text-gray-700 mb-4">Vous allez changer le nom d'utilisateur de <strong>{current?.nomUtilisateur}</strong> en <strong>{newUsername}</strong>. Continuer ?</p>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowConfirm(false)} className="px-3 py-1 border rounded">Annuler</button>
              <button disabled={isRenaming} onClick={async () => {
                setStatus(null);
                if (!current) return setStatus('Aucun utilisateur connecté.');
                setIsRenaming(true);
                try {
                  const ok = auth.changeUsername(current.nomUtilisateur, newUsername, checkPwdForRename || undefined);
                  if (ok) {
                    setStatus('Nom d\'utilisateur mis à jour. L\'application va se recharger.');
                    setShowConfirm(false);
                    // Ensure UI reflects changes: clear current session and reload so login page shows new username
                    try { auth.logout(); } catch (e) { /* ignore */ }
                    setTimeout(() => { window.location.reload(); }, 400);
                  } else {
                    setStatus('Échec : nom existant ou mot de passe incorrect.');
                    setShowConfirm(false);
                  }
                } finally {
                  setIsRenaming(false);
                }
              }} className="px-3 py-1 bg-red-600 text-white rounded">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
