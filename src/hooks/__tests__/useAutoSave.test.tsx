import { describe, it, expect, beforeEach } from 'vitest';
import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import useAutoSave from '../useAutoSave';

describe('useAutoSave (integration via react render)', () => {
  beforeEach(() => {
    localStorage.clear();
    // clean DOM
    document.body.innerHTML = '';
  });

  it('saveNow writes to localStorage and load/clear work', () => {
    const key = 'test:key';
    const initial = { a: 1 };

    const outRef: { current: any } = { current: null };

    function Harness({ k, v, out }: any) {
      const api = useAutoSave(k, v);
      useEffect(() => { out.current = api; }, [api]);
      return null;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<Harness k={key} v={initial} out={outRef} />);
    });

    // ensure hook attached
    expect(typeof outRef.current.saveNow).toBe('function');

    act(() => {
      outRef.current.saveNow();
    });

    const stored = localStorage.getItem(`autosave:${key}`);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string)).toEqual(initial);

    const loaded = outRef.current.load();
    expect(loaded).toEqual(initial);

    act(() => {
      outRef.current.clear();
    });
    expect(localStorage.getItem(`autosave:${key}`)).toBeNull();

    act(() => {
      root.unmount();
    });
  });
});
