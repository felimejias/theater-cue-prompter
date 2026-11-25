import { useEffect } from 'react';

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  onNextCue?: () => void;
  onPrevCue?: () => void;
  onGoCue?: (number: number) => void;
  onMarkComplete?: () => void;
  onMarkSkipped?: () => void;
  onUndo?: () => void;
  onSave?: () => void;
}

export function useKeyboardShortcuts({
  enabled = true,
  onNextCue,
  onPrevCue,
  onGoCue,
  onMarkComplete,
  onMarkSkipped,
  onUndo,
  onSave,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }

      const isMac = navigator.platform.includes('Mac');
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Navigation
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        onNextCue?.();
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey)) {
        e.preventDefault();
        onPrevCue?.();
        return;
      }

      // Number keys for direct cue access (1-9)
      if (e.key >= '1' && e.key <= '9' && !modifier) {
        e.preventDefault();
        onGoCue?.(parseInt(e.key, 10));
        return;
      }

      // Status changes
      if (e.key === 'c' && !modifier) {
        e.preventDefault();
        onMarkComplete?.();
        return;
      }

      if (e.key === 's' && !modifier) {
        e.preventDefault();
        onMarkSkipped?.();
        return;
      }

      // Undo
      if (modifier && e.key === 'z') {
        e.preventDefault();
        onUndo?.();
        return;
      }

      // Save
      if (modifier && e.key === 's') {
        e.preventDefault();
        onSave?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onNextCue, onPrevCue, onGoCue, onMarkComplete, onMarkSkipped, onUndo, onSave]);
}