import { useState, useCallback, useRef } from 'react';

export function useHistory<T>(initialState: T, maxHistory = 50) {
  const [state, setState] = useState<T>(initialState);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);

  const push = useCallback((newState: T) => {
    pastRef.current.push(state);
    if (pastRef.current.length > maxHistory) {
      pastRef.current.shift();
    }
    futureRef.current = [];
    setState(newState);
  }, [state, maxHistory]);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const previous = pastRef.current.pop()!;
    futureRef.current.unshift(state);
    setState(previous);
  }, [state]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.shift()!;
    pastRef.current.push(state);
    setState(next);
  }, [state]);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  const reset = useCallback((newState: T) => {
    setState(newState);
    pastRef.current = [];
    futureRef.current = [];
  }, []);

  return { state, setState: push, undo, redo, canUndo, canRedo, reset };
}