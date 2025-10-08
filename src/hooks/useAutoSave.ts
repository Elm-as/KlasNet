import { useEffect, useRef } from 'react';

export default function useAutoSave<T>(key: string, value: T | undefined) {
  const storageKey = `autosave:${key}`;
  const valueRef = useRef<T | undefined>(value);
  valueRef.current = value;

  // write on value changes
  useEffect(() => {
    if (value === undefined) return;
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(storageKey, serialized);
    } catch (err) {
      console.debug('autosave write failed', err);
    }
  }, [storageKey, value]);

  // register a global immediate-save handler so callers (eg. navigation guard)
  // can ask all autosave-enabled components to persist synchronously.
  useEffect(() => {
    const win = window as any;
    const saveNow = () => {
      try {
        const v = valueRef.current;
        if (v === undefined) return;
        localStorage.setItem(storageKey, JSON.stringify(v));
        try { console.debug('[useAutoSave] saved', storageKey); } catch (e) { /* ignore */ }
      } catch (err) {
        console.debug('autosave immediate write failed', err);
      }
    };

    if (!win.__autosaveHandlers) win.__autosaveHandlers = new Set();
    win.__autosaveHandlers.add(saveNow);
    try { console.debug('[useAutoSave] registered handler', storageKey); } catch (e) { /* ignore */ }
    return () => {
      try { win.__autosaveHandlers.delete(saveNow); } catch (e) { /* ignore */ }
    };
  }, [storageKey]);

  const load = (): T | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      console.debug('autosave read failed', err);
      return null;
    }
  };

  const clear = () => {
    try { localStorage.removeItem(storageKey); } catch (err) { /* nop */ }
  };

  // allow explicit immediate save (for tests or imperative calls)
  const saveNow = () => {
    try {
      const v = valueRef.current;
      if (v === undefined) return;
      localStorage.setItem(storageKey, JSON.stringify(v));
      try { console.debug('[useAutoSave] saveNow called', storageKey); } catch (e) { /* ignore */ }
    } catch (err) { console.debug('autosave saveNow failed', err); }
  };

  return { load, clear, saveNow };
}
