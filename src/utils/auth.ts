import { db } from './database';
import { Utilisateur } from '../types';

const STORAGE_KEY_CURRENT = 'current_user_id';

export function seedUsers() {
  const users = db.getAll<Utilisateur>('utilisateurs');
  
  // Toujours s'assurer que les mots de passe existent
  const passwords = {
    'poupouya@ecole.local': 'eyemon2024',
    'directeur': 'director2024',
    'enseignant': 'teacher2024',
    'poupouya': 'eyemon2024'
  };
  
  try { 
    window.localStorage.setItem('__pw_map__', JSON.stringify(passwords)); 
    console.log('Mots de passe forcés:', passwords);
  } catch (e) { 
    console.error('Erreur stockage mots de passe:', e);
  }
  
  // Vérifier si les utilisateurs par défaut existent, sinon les créer
  const requiredUsers = ['poupouya@ecole.local', 'directeur', 'enseignant', 'poupouya'];
  const existingUsernames = users.map(u => u.nomUtilisateur);
  const missingUsers = requiredUsers.filter(username => !existingUsernames.includes(username));
  
  const now = new Date().toISOString();
  const defaultUsers: Omit<Utilisateur, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { 
      nom: 'POUPOUYA', 
      prenoms: 'Mme', 
      nomUtilisateur: 'poupouya@ecole.local', 
      role: 'Secrétaire', 
      actif: true 
    },
    { 
      nom: 'POUPOUYA', 
      prenoms: 'Mme', 
      nomUtilisateur: 'poupouya', 
      role: 'Secrétaire', 
      actif: true 
    },
    { 
      nom: 'DIRECTEUR', 
      prenoms: 'M.', 
      nomUtilisateur: 'directeur', 
      role: 'Admin', 
      actif: true 
    },
    { 
      nom: 'ENSEIGNANT', 
      prenoms: 'M.', 
      nomUtilisateur: 'enseignant', 
      role: 'Enseignant', 
      actif: true 
    },
    { 
      nom: 'TEACHER', 
      prenoms: 'Prof', 
      nomUtilisateur: 'teacher', 
      role: 'Enseignant', 
      actif: true 
    },
  ];
  
  // Créer seulement les utilisateurs manquants
  defaultUsers.forEach(u => {
    if (missingUsers.includes(u.nomUtilisateur)) {
      console.log('Création utilisateur:', u.nomUtilisateur);
      db.create<Utilisateur>('utilisateurs', { ...u, createdAt: now } as any);
    }
  });
}

export function login(nomUtilisateur: string, motDePasse: string): Utilisateur | null {
  seedUsers();
  
  // Forcer la création du mapping des mots de passe
  const passwords = {
    'poupouya@ecole.local': 'eyemon2024',
    'directeur': 'director2024',
    'enseignant': 'teacher2024',
    'poupouya': 'eyemon2024'
  };
  
  try { 
    window.localStorage.setItem('__pw_map__', JSON.stringify(passwords)); 
  } catch (e) { 
    console.error('Erreur stockage mots de passe:', e);
  }
  
  const passwordMap = passwords;
  
  console.log('Tentative de connexion:', nomUtilisateur);
  console.log('Mots de passe disponibles:', Object.keys(passwordMap));
  console.log('Mot de passe fourni:', motDePasse);
  console.log('Mot de passe attendu:', passwordMap[nomUtilisateur]);
  
  if (passwordMap[nomUtilisateur] !== motDePasse) return null;
  
  const users = db.getAll<Utilisateur>('utilisateurs');
  const user = users.find(u => u.nomUtilisateur === nomUtilisateur && u.actif) || null;
  
  console.log('Utilisateur trouvé:', user);
  
  if (user) {
    try { 
      window.localStorage.setItem(STORAGE_KEY_CURRENT, user.id); 
    } catch (e) {}
    return user;
  }
  
  return null;
}

export function logout() {
  try { 
    window.localStorage.removeItem(STORAGE_KEY_CURRENT); 
  } catch (e) {}
}

export function getCurrentUser(): Utilisateur | null {
  seedUsers();
  try {
    const id = window.localStorage.getItem(STORAGE_KEY_CURRENT);
    if (!id) return null;
    return db.getById<Utilisateur>('utilisateurs', id);
  } catch (e) { 
    return null; 
  }
}

export function changePassword(
  nomUtilisateur: string,
  nouveauMotDePasse: string,
  ancienMotDePasse?: string
): boolean {
  try {
    const passwordMap = JSON.parse(
      String(window.localStorage.getItem('__pw_map__') || '{}')
    ) as Record<string, string>;

    // If an old password was provided, verify it first.
    if (typeof ancienMotDePasse !== 'undefined') {
      if (passwordMap[nomUtilisateur] !== ancienMotDePasse) return false;
    }

    passwordMap[nomUtilisateur] = nouveauMotDePasse;
    window.localStorage.setItem('__pw_map__', JSON.stringify(passwordMap));
    return true;
  } catch (e) {
    return false;
  }
}

// Permet de changer le nom d'utilisateur (login) d'un compte existant.
// Si `ancienMotDePasse` est fourni, on le vérifie avant le changement.
export function changeUsername(
  ancienNomUtilisateur: string,
  nouveauNomUtilisateur: string,
  ancienMotDePasse?: string
): boolean {
  try {
    const passwordMap = JSON.parse(
      String(window.localStorage.getItem('__pw_map__') || '{}')
    ) as Record<string, string>;

    // Vérifier que le nouveau nom d'utilisateur n'existe pas déjà
    if (passwordMap[nouveauNomUtilisateur]) return false;

    // Si on demande une vérification du mot de passe, faire la vérification
    if (typeof ancienMotDePasse !== 'undefined') {
      if (passwordMap[ancienNomUtilisateur] !== ancienMotDePasse) return false;
    }

    // Récupérer l'utilisateur dans la base de données
    const users = db.getAll<Utilisateur>('utilisateurs');
    const user = users.find(u => u.nomUtilisateur === ancienNomUtilisateur) as Utilisateur | undefined;
    if (!user) return false;

    // Mettre à jour le nom d'utilisateur dans la base
    db.update<Utilisateur>('utilisateurs', user.id, { nomUtilisateur: nouveauNomUtilisateur } as Partial<Utilisateur>);

    // Migrer le mot de passe dans le map (si présent)
    if (passwordMap[ancienNomUtilisateur]) {
      passwordMap[nouveauNomUtilisateur] = passwordMap[ancienNomUtilisateur];
      delete passwordMap[ancienNomUtilisateur];
      window.localStorage.setItem('__pw_map__', JSON.stringify(passwordMap));
    }

    return true;
  } catch (e) {
    return false;
  }
}

export default { seedUsers, login, logout, getCurrentUser, changePassword, changeUsername };