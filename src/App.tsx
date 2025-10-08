import React, { useState } from 'react';
import LicenceGuard from './components/Licence/LicenceGuard';
import { ToastProvider } from './components/Layout/ToastProvider';
import LoginForm from './components/Auth/LoginForm';
import Header from './components/Layout/Header';
import DiscardModal from './components/UI/DiscardModal';
import Dashboard from './components/Dashboard/Dashboard';
import ElevesList from './components/Eleves/ElevesList';
import EleveForm from './components/Eleves/EleveForm';
import EnseignantsList from './components/Enseignants/EnseignantsList';
import EnseignantForm from './components/Enseignants/EnseignantForm';
import ClassesList from './components/Classes/ClassesList';
import ClasseForm from './components/Classes/ClasseForm';
import MatieresList from './components/Matieres/MatieresList';
import MatiereForm from './components/Matieres/MatiereForm';
import NotesParClasse from './components/Notes/NotesParClasse';
import ConfigMain from './components/Config/ConfigMain';
import FinancesList from './components/Finances/FinancesList';
import ComptabiliteList from './components/Comptabilite/ComptabiliteList';
import Guide from './components/Guide';
import UserProfile from './components/Layout/UserProfile';
import UserSettings from './components/Layout/UserSettings';
import auth, { logout } from './utils/auth';
import { seedDefaults } from './utils/seedDefaults';
import { initializeDefaultFrais } from './utils/defaultFraisScolaires';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => auth.getCurrentUser());
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Initialiser les données par défaut si nécessaire
  React.useEffect(() => {
    if (!currentUser) return;
    try {
      seedDefaults();
      initializeDefaultFrais();
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des données par défaut:', error);
    }
  }, [currentUser]);

  // Force logout when the window is closed so the app asks for auth on next open.
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      try { logout(); } catch (e) { /* ignore */ }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Écouter les événements de navigation
  React.useEffect(() => {
    const handleNavigateEvent = (event: any) => {
      try {
        const win: any = window as any;
        // If the global discard modal is already open, ignore further navigate events
        if (win && win.__discardModalOpen) {
          try { console.debug('[App] navigate ignored because discard modal open'); } catch (e) { /* ignore */ }
          return;
        }

        let hasDirty = false;
        if (win.__unsavedGuards && typeof win.__unsavedGuards.forEach === 'function') {
          win.__unsavedGuards.forEach((g: Function) => { try { if (g()) hasDirty = true; } catch (e) { /* ignore */ } });
        }

        if (hasDirty) {
          // Stop the original navigation so components don't unmount
          if (event && typeof event.stopImmediatePropagation === 'function') {
            try { event.stopImmediatePropagation(); } catch (e) { /* ignore */ }
          }

          // ask autosave handlers to persist drafts now
          if (win.__autosaveHandlers && typeof win.__autosaveHandlers.forEach === 'function') {
            win.__autosaveHandlers.forEach((h: Function) => { try { h(); } catch (e) { /* ignore */ } });
          }

          // Store pending navigation so the modal confirm can re-dispatch it
          (win as any).__pendingNavigation = event.detail;
          // show our central modal
          setPendingNav(event.detail);
          setShowGlobalDiscard(true);
          return;
        }

        const { page, action } = event.detail || {};
        if (page) {
          setCurrentPage(page);
          if (action === 'new') {
            setSelectedItem(null);
            setShowForm(true);
          } else {
            setShowForm(false);
            setSelectedItem(null);
          }
        }
      } catch (err) {
        console.debug('navigate guard check failed', err);
      }
    };

    window.addEventListener('navigate', handleNavigateEvent);
    return () => window.removeEventListener('navigate', handleNavigateEvent);
  }, []);

  // Top-level navigation helper used by Header and other callers
  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setSelectedItem(null);
    setShowForm(false);
  };

  const handleItemSelect = (item: unknown) => {
    setSelectedItem(item);
    setShowForm(true);
  };

  const handleNewItem = () => {
    setSelectedItem(null);
    setShowForm(true);
  };

  const handleFormSave = () => {
    setShowForm(false);
    setSelectedItem(null);
    try {
      // db already dispatches dataChanged when it mutates data
    } catch (e) { /* ignore */ }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedItem(null);
  };

  const [showGlobalDiscard, setShowGlobalDiscard] = React.useState(false);
  const [pendingNav, setPendingNav] = React.useState<any>(null);

  const confirmGlobalDiscard = async () => {
    const win: any = window as any;
    // Prevent components from re-dispatching navigation while we handle it
    try { win.__preventReDispatch = true; } catch (e) { /* ignore */ }
    try { win.__forceNavigationInProgress = true; } catch (e) { /* ignore */ }
    try {
      // Call all registered allow handlers so components can clear their dirty state
      const handlers = Array.from(win.__unsavedAllowHandlers || []);
      for (const h of handlers) {
        try { await h(); } catch (e) { console.debug('allow handler failed', e); }
      }
      // notify components via event as well
      try { window.dispatchEvent(new CustomEvent('unsaved:allow')); } catch (e) { /* ignore */ }

      // close modal and consume pending navigation
      setShowGlobalDiscard(false);
      const detail = pendingNav || win.__pendingNavigation || null;
      setPendingNav(null);
      try { if (typeof window !== 'undefined') win.__pendingNavigation = null; } catch (e) { /* ignore */ }

      // Perform the navigation directly in the app (avoid re-dispatch loops)
      if (detail && detail.page) {
        const { page, action } = detail;
        setCurrentPage(page);
        if (action === 'new') {
          setSelectedItem(null);
          setShowForm(true);
        }
      }
    } catch (err) {
      console.error('confirmGlobalDiscard failed', err);
      setShowGlobalDiscard(false);
      setPendingNav(null);
    } finally {
      // Clear flags shortly after to let components settle
      setTimeout(() => {
        try { win.__forceNavigationInProgress = false; } catch (e) { /* ignore */ }
        try { win.__preventReDispatch = false; } catch (e) { /* ignore */ }
        try { win.__unsavedGuards = new Set(); } catch (e) { /* ignore */ }
      }, 60);
    }
  };

  const cancelGlobalDiscard = () => {
    setShowGlobalDiscard(false);
    setPendingNav(null);
    try { const win: any = window as any; win.__pendingNavigation = null; } catch (e) { /* ignore */ }
  };

  const handleLogin = (user: any) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    try { auth.logout(); } catch (e) { /* ignore */ }
    setCurrentUser(null);
    // Return to dashboard after logout
    setCurrentPage('dashboard');
  };


  const renderContent = () => {
    if (showForm) {
      switch (currentPage) {
        case 'eleves':
          return (
            <EleveForm
              eleve={selectedItem}
              onSave={handleFormSave}
              onCancel={handleFormCancel}
            />
          );
        case 'enseignants':
          return (
            <EnseignantForm
              enseignant={selectedItem}
              onSave={handleFormSave}
              onCancel={handleFormCancel}
            />
          );
        case 'classes':
          return (
            <ClasseForm
              classe={selectedItem}
              onSave={handleFormSave}
              onCancel={handleFormCancel}
            />
          );
        case 'matieres':
          return (
            <MatiereForm
              matiere={selectedItem}
              onSave={handleFormSave}
              onCancel={handleFormCancel}
            />
          );
        default:
          return <Dashboard />;
      }
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'profil':
        return <UserProfile user={currentUser} />;
      case 'parametres':
        return <UserSettings />;
      case 'finances':
        return <FinancesList />;
      case 'comptabilite':
        return <ComptabiliteList />;
      case 'eleves':
        return (
          <ElevesList
            onEleveSelect={handleItemSelect}
            onNewEleve={handleNewItem}
          />
        );
      case 'enseignants':
        return (
          <EnseignantsList
            onEnseignantSelect={handleItemSelect}
            onNewEnseignant={handleNewItem}
          />
        );
      case 'classes':
        return (
          <ClassesList
            onClasseSelect={handleItemSelect}
            onNewClasse={handleNewItem}
          />
        );
      case 'matieres':
        return (
          <MatieresList
            onMatiereSelect={handleItemSelect}
            onNewMatiere={handleNewItem}
          />
        );
      case 'notes':
        return <NotesParClasse />;
      case 'config':
        return <ConfigMain />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ToastProvider>
      {!currentUser ? (
        <LoginForm onLogin={handleLogin} />
      ) : (
        <LicenceGuard>
          <div className="min-h-screen bg-gray-50">
            <Header
              currentUser={currentUser}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
              currentPage={currentPage}
              onShowGuide={() => setShowGuide(true)}
            />
            <main>
              {renderContent()}
            </main>
            {showGlobalDiscard && (
              <DiscardModal
                open={showGlobalDiscard}
                title="Quitter sans sauvegarder ?"
                description="Certaines pages ont des modifications non sauvegardées. Voulez-vous quitter et perdre ces modifications ?"
                onConfirm={confirmGlobalDiscard}
                onCancel={cancelGlobalDiscard}
              />
            )}
            {showGuide && <Guide onClose={() => setShowGuide(false)} />}
          </div>
        </LicenceGuard>
      )}
    </ToastProvider>
  );
}