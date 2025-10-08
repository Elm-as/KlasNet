// Removed duplicate import statement
// import { useEffect, useRef, useState } from 'react';

/**
 * useUnsavedWarning
 * - isDirty: boolean indiquant s'il y a des modifications non sauvegardées
 * - message: texte à afficher dans la boîte de confirmation
 *
 * Comportement:
 * - Ajoute un listener beforeunload pour prévenir lors du rafraîchissement/fermeture
 * - Intercepte popstate pour prévenir lors d'une navigation historique (back/forward)
 */
import { useEffect, useRef, useState } from 'react'; // Keep this import

type Controller = {
  showPrompt: boolean;
  openPrompt: () => void;
  closePrompt: () => void;
  allowNavigation: () => void; // Added allowNavigation to the Controller type
};

export default function useUnsavedWarning(isDirty: boolean, message = "Vous avez des modifications non sauvegardées. Vouliez-vous quitter sans enregistrer ?"): Controller | null {
  const [showPrompt, setShowPrompt] = useState(false);
  const isDirtyRef = useRef(false);
  isDirtyRef.current = !!isDirty;
  const pendingNavRef = useRef<any>(null);

  useEffect(() => {
    // Register a guard function so a central navigator (App) can ask if any
    // component is dirty before switching pages.
    let guard: Function | null = null;
    let allowHandler: Function | null = null;
    try {
      const win: any = window as any;
      if (!win.__unsavedGuards) win.__unsavedGuards = new Set();
      guard = () => {
        try {
          const win: any = window as any;
          if (win && win.__skipUnsavedGuards) return false;
          if (win && win.__forceNavigationInProgress) return false;
        } catch (e) { /* ignore */ }
        return !!isDirtyRef.current;
      };
      win.__unsavedGuards.add(guard);
      // register a small allow handler so the app can clear per-component dirty flags
      if (!win.__unsavedAllowHandlers) win.__unsavedAllowHandlers = new Set();
      allowHandler = () => { try { (isDirtyRef as any).current = false; setShowPrompt(false); } catch (e) { /* ignore */ } };
      win.__unsavedAllowHandlers.add(allowHandler);
  try { console.debug('[useUnsavedWarning] registered guard', { id: allowHandler && allowHandler.toString().slice(0,40) }); } catch (e) { /* ignore */ }
    } catch (e) {
      // ignore environment without window
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    // For SPA internal navigation (back/forward) we'll not call window.confirm here.
    // Instead consumers can use the returned controller to display a custom modal
    // and decide to proceed or cancel navigation. We still push state back when
    // the user cancels navigation inside popstate to restore location.
    const handlePopState = () => {
      if (!isDirtyRef.current) return;
      // push back to keep URL until the app decides to allow navigation
      history.pushState(null, document.title, window.location.href);
      // Open the prompt via state; consumer should listen to controller.showPrompt
      setShowPrompt(true);
    };

    // Intercept in-app navigation events (the app uses a CustomEvent 'navigate')
    // We register in capture so this runs before App listeners registered earlier.
    const handleAppNavigate = (ev: any) => {
      try { console.debug('[useUnsavedWarning] handleAppNavigate called, dirty=', isDirtyRef.current); } catch (e) { /* ignore */ }
      try { const win: any = window as any; if (win && win.__forceNavigationInProgress) { console.debug('[useUnsavedWarning] skipping due to forceNavigation flag'); return; } } catch (e) { /* ignore */ }
      if (!isDirtyRef.current) return;
      // Stop other listeners and propagation so the App doesn't change page
      // before we show the prompt and persist drafts.
      try { if (ev && typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation(); } catch (e) { /* ignore */ }

      // store requested navigation detail for later
      pendingNavRef.current = ev?.detail || { page: null };

      // Ask all autosave handlers to persist now (so drafts are stored)
      try {
        const win: any = window as any;
        try { console.debug('[useUnsavedWarning] calling autosave handlers'); } catch (e) { /* ignore */ }
        if (win.__autosaveHandlers && typeof win.__autosaveHandlers.forEach === 'function') {
          win.__autosaveHandlers.forEach((h: Function) => {
            try { h(); } catch (e) { console.debug('autosave handler failed', e); }
          });
        }
      } catch (e) { /* ignore */ }

      // Open modal prompt
      setShowPrompt(true);
      // push state back in history to avoid changing URL during blocked nav
      try { history.pushState(null, document.title, window.location.href); } catch (e) { /* ignore */ }
    };

    // When the app confirms discard, it may dispatch an 'unsaved:allow' event
    // to make components explicitly clear their local prompt and pending nav.
    const handleUnsavedAllowEvent = () => {
      try { console.debug('[useUnsavedWarning] unsaved:allow received, running allowHandler'); } catch (e) { /* ignore */ }
      try { if (typeof allowHandler === 'function') (allowHandler as any)(); } catch (e) { /* ignore */ }
    };

    window.addEventListener('unsaved:allow', handleUnsavedAllowEvent as EventListener);

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    // capture:true so our handler runs before app-level listeners registered earlier
    window.addEventListener('navigate', handleAppNavigate as EventListener, true);

    return () => {
      try {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('navigate', handleAppNavigate as EventListener, true);
        window.removeEventListener('unsaved:allow', handleUnsavedAllowEvent as EventListener);
      } catch (e) { /* ignore */ }
      try {
        const win: any = window as any;
        if (guard && win && win.__unsavedGuards) win.__unsavedGuards.delete(guard);
        if (allowHandler && win && win.__unsavedAllowHandlers) win.__unsavedAllowHandlers.delete(allowHandler);
      } catch (e) { /* ignore */ }
    };
  }, [message]);

  const openPrompt = () => setShowPrompt(true);
  const closePrompt = () => setShowPrompt(false);

  const allowNavigation = () => {
    // Temporarily mark not dirty to allow popstate to proceed naturally
    // We briefly clear the prompt and programmatically go back/forward if needed.
    setShowPrompt(false);
    // Clear dirty ref so beforeunload won't trigger when navigation proceeds
    (isDirtyRef as any).current = false;
    // If we have a pending app-level navigation request, re-dispatch it so the
    // App can handle it (it will now navigate because we've cleared the dirty flag).
    const pending = pendingNavRef.current;
    pendingNavRef.current = null;
    setTimeout(() => {
      try {
        const win: any = window as any;
        // If the app has already confirmed and will navigate itself, don't re-dispatch
        if (win && (win.__preventReDispatch || win.__forceNavigationInProgress)) {
          try { console.debug('[useUnsavedWarning] skipping re-dispatch because app will handle navigation'); } catch (e) { /* ignore */ }
          return;
        }
        if (pending && pending.page) {
          window.dispatchEvent(new CustomEvent('navigate', { detail: pending }));
        } else {
          // fallback to history back to allow popstate navigation
          history.back();
        }
      } catch (err) { console.debug('allowNavigation failed', err); }
    }, 0);
  };

  return { showPrompt, openPrompt, closePrompt, allowNavigation };
}
