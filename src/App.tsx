import { useState, useEffect, useCallback } from 'react';
import type { TheaterScript, TheaterSettings } from './types';
import { loadSelectedScriptId, loadScripts, loadSettings } from './storage';
import { LibraryView } from './components/LibraryView';
import { EditorView } from './components/EditorView';
import './styles.css';

function App() {
  const [view, setView] = useState<'library' | 'editor'>('library');
  const [scripts, setScripts] = useState<TheaterScript[]>(() => loadScripts());
  const [selectedScript, setSelectedScript] = useState<TheaterScript | null>(null);
  const settings = useState<TheaterSettings>(() => loadSettings())[0];

  useEffect(() => {
    const savedId = loadSelectedScriptId();
    if (savedId) {
      const script = scripts.find(s => s.id === savedId);
      if (script) {
        setSelectedScript(script);
        setView('editor');
      }
    }
  }, [scripts]);

  const handleOpenEditor = useCallback((scriptId: string) => {
    const script = scripts.find(s => s.id === scriptId);
    if (script) {
      setSelectedScript(script);
      setView('editor');
    }
  }, [scripts]);

  const handleExitEditor = useCallback(() => {
    setSelectedScript(null);
    setView('library');
  }, []);

  const handleScriptUpdate = useCallback((updatedScript: TheaterScript) => {
    setScripts(prev => prev.map(s => s.id === updatedScript.id ? updatedScript : s));
    if (selectedScript?.id === updatedScript.id) {
      setSelectedScript(updatedScript);
    }
  }, [selectedScript]);

  if (view === 'editor' && selectedScript) {
    return (
      <EditorView
        script={selectedScript}
        onExit={handleExitEditor}
        onScriptUpdate={handleScriptUpdate}
      />
    );
  }

  return (
    <LibraryView
      onOpenEditor={handleOpenEditor}
      currentSettings={settings}
    />
  );
}

export default App;