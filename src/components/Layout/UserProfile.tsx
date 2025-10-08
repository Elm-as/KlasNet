import { useState, ChangeEvent } from 'react';
import { db } from '../../utils/database';
import { formatNomPrenoms } from '../../utils/formatName';
import { useToast } from './ToastProvider';

interface Props {
  user: { id?: string; prenoms?: string; nom?: string; role?: string; avatar?: string } | null;
}

export default function UserProfile({ user }: Props) {
  const [preview, setPreview] = useState<string | null>(user?.avatar || null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [prenomEdit, setPrenomEdit] = useState(user?.prenoms || '');
  const [nomEdit, setNomEdit] = useState(user?.nom || '');
  const [roleEdit, setRoleEdit] = useState(user?.role || '');
  const { showToast } = useToast();
  const [fileName, setFileName] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ prenom?: string; nom?: string }>({});

  if (!user) return <div className="p-6">Aucun utilisateur connecté.</div>;

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(f);
    setFileName(f.name);
  };

  const saveAvatar = async () => {
    if (!user?.id || !preview) return;
    setSaving(true);
    try {
      db.update('utilisateurs', user.id, { avatar: preview } as any);
      try { showToast('Avatar enregistré', 'success'); } catch (e) { /* ignore */ }
    } finally {
      setSaving(false);
  // dataChanged dispatched by db methods
    }
  };

  const saveProfile = async () => {
    if (!user?.id) return;
    // validation
    const newErrors: typeof errors = {};
    if (!prenomEdit || prenomEdit.trim().length === 0) newErrors.prenom = 'Prénoms requis.';
    if (!nomEdit || nomEdit.trim().length === 0) newErrors.nom = 'Nom requis.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      db.update('utilisateurs', user.id, { prenoms: prenomEdit, nom: nomEdit, role: roleEdit } as any);
      try { showToast('Profil mis à jour', 'success'); } catch (e) { /* ignore */ }
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow">
      <h2 className="text-lg font-bold mb-4">Profil utilisateur</h2>
      <div className="flex items-start space-x-6">
          <div className="w-36">
          <div className="w-32 h-32 rounded-full bg-gray-100 overflow-hidden shadow">
            {preview ? <img src={preview} alt="avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400">A</div>}
          </div>
          <div className="mt-2 flex flex-col space-y-2">
            <label className="inline-flex items-center px-3 py-2 bg-white border rounded cursor-pointer text-sm">
              <input type="file" accept="image/*" onChange={onFile} className="hidden" />
              Choisir un fichier
            </label>
            {fileName && <div className="text-xs text-gray-500">{fileName}</div>}
            {preview && (
              <div>
                <button onClick={saveAvatar} disabled={saving} className="px-3 py-1 bg-teal-600 text-white rounded">{saving ? 'Enregistrement...' : 'Enregistrer avatar'}</button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1">
          <div className="space-y-2">
            {!editing ? (
              <>
                <div><span className="text-sm text-gray-500">Nom</span><div className="font-semibold">{formatNomPrenoms(user)}</div></div>
                <div><span className="text-sm text-gray-500">Rôle</span><div className="text-sm">{user.role}</div></div>
                <div className="mt-3">
                  <button onClick={() => setEditing(true)} className="px-3 py-1 bg-slate-600 text-white rounded">Modifier le profil</button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500">Prénoms</label>
                  <input value={prenomEdit} onChange={e => setPrenomEdit(e.target.value)} className="mt-1 block w-full border rounded px-2 py-1" />
                  {errors.prenom && <div className="text-xs text-red-600 mt-1">{errors.prenom}</div>}
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Nom</label>
                  <input value={nomEdit} onChange={e => setNomEdit(e.target.value)} className="mt-1 block w-full border rounded px-2 py-1" />
                  {errors.nom && <div className="text-xs text-red-600 mt-1">{errors.nom}</div>}
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Rôle</label>
                  <select value={roleEdit} onChange={e => setRoleEdit(e.target.value)} className="mt-1 block w-full border rounded px-2 py-1">
                    <option value="Secrétaire">Secrétaire</option>
                    <option value="Enseignant">Enseignant</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={saveProfile} disabled={saving} className="px-3 py-1 bg-teal-600 text-white rounded">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
                  <button onClick={() => { setEditing(false); setErrors({}); }} className="px-3 py-1 border rounded">Annuler</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
