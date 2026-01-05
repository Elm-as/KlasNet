import { useState, useEffect, useRef } from 'react';
import { formatNomPrenoms } from '../../utils/formatName';
import { School, User, Menu, X } from 'lucide-react';

interface UserType {
  id?: string;
  prenoms?: string;
  nom?: string;
  role?: string;
  avatar?: string;
}

interface HeaderProps {
  currentUser: UserType | null;
  onLogout: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
  onShowGuide?: () => void;
}

export default function Header({ currentUser, onLogout, onNavigate, currentPage, onShowGuide }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const capitalize = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) setUserMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord' },
    { id: 'eleves', label: 'Élèves' },
    { id: 'enseignants', label: 'Enseignants' },
    { id: 'classes', label: 'Classes' },
    { id: 'matieres', label: 'Matières' },
    { id: 'finances', label: 'Finances' },
    { id: 'recouvrement', label: 'Recouvrement' },
    { id: 'notes', label: 'Notes' },
    { id: 'config', label: 'Configuration' },
    { id: 'comptabilite', label: 'Comptabilité' },
  ];

  const toggleUserMenu = () => setUserMenuOpen((v) => !v);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo et nom */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <School className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">KlasNet</h1>
                <p className="text-xs text-gray-500">Gestion Scolaire</p>
              </div>
            </div>

            {/* Horloge discrète */}
            <div className="hidden lg:block bg-gray-50 px-3 py-1 rounded-md border border-gray-200">
              <div className="text-xs text-gray-500">
                {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Navigation desktop */}
          <nav className="hidden md:flex space-x-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  try { window.dispatchEvent(new CustomEvent('navigate', { detail: { page: item.id } })); }
                  catch (e) { onNavigate(item.id); }
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === item.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Actions utilisateur */}
          <div className="flex items-center space-x-4">
            <button
              className="hidden md:block px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              onClick={() => onShowGuide && onShowGuide()}
            >
              Guide
            </button>

            {/* Menu utilisateur */}
            <div className="relative" ref={menuRef}>
              <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-md transition-colors" onClick={toggleUserMenu}>
                {currentUser && currentUser.avatar ? (
                  <img src={currentUser.avatar} alt="avatar" className="h-8 w-8 rounded-full object-cover border border-gray-200" />
                ) : (
                  <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200">
                    <User className="h-4 w-4 text-gray-500" />
                  </div>
                )}
                <div className="hidden sm:block text-sm text-gray-700">
                  <div className="font-medium">
                    {formatNomPrenoms(currentUser)}
                  </div>
                  <div className="text-xs text-gray-500">{capitalize(currentUser?.role)}</div>
                </div>
              </div>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      try { window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'profil' } })); }
                      catch (e) { onNavigate('profil'); }
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Profil
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      try { window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'parametres' } })); }
                      catch (e) { onNavigate('parametres'); }
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Paramètres
                  </button>
                  <div className="border-t border-gray-200" />
                  <button 
                    onClick={onLogout} 
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Déconnexion
                  </button>
                </div>
              )}
            </div>

            {/* Menu mobile */}
            <button
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-2 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  try { window.dispatchEvent(new CustomEvent('navigate', { detail: { page: item.id } })); }
                  catch (e) { onNavigate(item.id); }
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === item.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
              onClick={() => {
                onShowGuide && onShowGuide();
                setMobileMenuOpen(false);
              }}
            >
              Guide
            </button>
          </div>
        </div>
      )}
    </header>
  );
}