// setupTests.ts
// Setup global helpers for tests
import 'whatwg-fetch';

// Provide minimal window.localStorage mock if absent (Vitest jsdom should provide it)
if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    _data: {} as Record<string,string>,
    getItem(key: string) { return this._data[key] ?? null; },
    setItem(key: string, value: string) { this._data[key] = String(value); },
    removeItem(key: string) { delete this._data[key]; },
    clear() { this._data = {}; }
  };
}
