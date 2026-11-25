import { useState, useCallback, useEffect } from 'react';
import type { TheaterScript, TheaterSettings } from '../types';
import { loadScripts, saveScripts, createScript, saveSelectedScriptId, loadSettings } from '../storage';

interface LibraryViewProps {
  onOpenEditor: (scriptId: string) => void;
  currentSettings: TheaterSettings;
}

export function LibraryView({ onOpenEditor, currentSettings }: LibraryViewProps) {
  const [scripts, setScripts] = useState<TheaterScript[]>(() => loadScripts());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newScriptTitle, setNewScriptTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [settings] = useState<TheaterSettings>(() => loadSettings());

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleCreateScript = useCallback(() => {
    const title = newScriptTitle.trim() || 'Espectáculo sin título';
    const script = createScript(title);
    const updated = [script, ...scripts];
    setScripts(updated);
    saveScripts(updated);
    saveSelectedScriptId(script.id);
    onOpenEditor(script.id);
    setShowCreateModal(false);
    setNewScriptTitle('');
    showToast('Espectáculo creado', 'success');
  }, [newScriptTitle, scripts, onOpenEditor, showToast]);

  const handleDeleteScript = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  const handleConfirmDelete = useCallback((id: string) => {
    const updated = scripts.filter(s => s.id !== id);
    setScripts(updated);
    saveScripts(updated);
    setDeleteConfirmId(null);
    showToast('Espectáculo eliminado', 'success');
  }, [scripts, showToast]);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  const handleOpenEditor = useCallback((id: string) => {
    saveSelectedScriptId(id);
    onOpenEditor(id);
  }, [onOpenEditor]);

  const handleDuplicateScript = useCallback((script: TheaterScript) => {
    const newScript: TheaterScript = {
      ...script,
      id: crypto.randomUUID(),
      title: `${script.title} (copia)`,
      updatedAt: Date.now(),
    };
    const updated = [newScript, ...scripts];
    setScripts(updated);
    saveScripts(updated);
    showToast('Espectáculo duplicado', 'success');
  }, [scripts, showToast]);

  const handleThemeChange = useCallback((theme: 'dark' | 'light' | 'auto') => {
    document.documentElement.setAttribute('data-theme', theme);
    showToast(`Tema: ${theme === 'auto' ? 'Sistema' : theme}`, 'info');
  }, [showToast]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentSettings.theme);
  }, [currentSettings.theme]);

  return (
    <div className="app">
      <header className="header">
        <h1 className="header-title">Theater Cue Prompter</h1>
        <div className="header-actions">
          <select
            className="btn"
            value={settings.theme}
            onChange={(e) => handleThemeChange(e.target.value as 'dark' | 'light' | 'auto')}
            style={{ padding: '4px 8px', fontSize: 11 }}
          >
            <option value="dark">🌙 Oscuro</option>
            <option value="light">☀️ Claro</option>
            <option value="auto">💻 Sistema</option>
          </select>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + Nuevo Espectáculo
          </button>
        </div>
      </header>

      <div className="main">
        <aside className="sidebar" style={{ width: 360 }}>
          <div className="sidebar-tabs">
            <button className="sidebar-tab active">🎭 Espectáculos</button>
          </div>
          <div className="sidebar-content">
            {scripts.length === 0 ? (
              <div className="empty-state" style={{ padding: 40, margin: 8 }}>
                <div className="empty-state-icon">🎭</div>
                <div>No hay espectáculos aún</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>Crea tu primer espectáculo</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {scripts.map((script) => (
                  <div
                    key={script.id}
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: 12,
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onClick={() => handleOpenEditor(script.id)}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{script.title}</div>
                    {script.author && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>por {script.author}</div>}
                    <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--muted)', marginBottom: 8, flexWrap: 'wrap' }}>
                      <span>📋 {script.cues.length} cues</span>
                      <span>🎭 {script.acts.length} actos</span>
                      <span>👥 {script.roles.length} roles</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); handleOpenEditor(script.id); }}>Abrir</button>
                      <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); handleDuplicateScript(script); }}>Duplicar</button>
                      <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteScript(script.id); }}>Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', background: 'var(--bg)' }}>
          <div style={{ maxWidth: 600 }}>
            <div style={{ fontSize: 64, marginBottom: 24 }}>🎭</div>
            <h2 style={{ fontSize: 28, fontWeight: 600, marginBottom: 16 }}>Theater Cue Prompter</h2>
            <p style={{ color: 'var(--muted)', fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
              Gestiona cues de iluminación, sonido, escena y proyección para teatro.
              Lista de cues numerada, hoja de cues imprimible, roles, actos y escenas.
            </p>

            <button className="btn btn-primary" style={{ padding: '16px 32px', fontSize: 16 }} onClick={() => setShowCreateModal(true)}>
              Crear Primer Espectáculo
            </button>

            <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border)', textAlign: 'left' }}>
              <h3 style={{ marginBottom: 16, fontSize: 16 }}>Atajos Principales (en Editor)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: 13, color: 'var(--muted)', fontFamily: 'monospace' }}>
                <div><kbd>Espacio / Enter / → / ↓</kbd> Siguiente cue</div>
                <div><kbd>← / ↑ / Shift+Enter</kbd> Cue anterior</div>
                <div><kbd>1-9</kbd> Ir a cue #</div>
                <div><kbd>C</kbd> Marcar completada</div>
                <div><kbd>S</kbd> Marcar saltada</div>
                <div><kbd>Ctrl+Z</kbd> Deshacer</div>
                <div><kbd>Ctrl+S</kbd> Guardar</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Nuevo Espectáculo</h2>
            <input
              type="text"
              className="modal-input"
              placeholder="Título del espectáculo"
              value={newScriptTitle}
              onChange={e => setNewScriptTitle(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleCreateScript(); if (e.key === 'Escape') setShowCreateModal(false); }}
            />
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowCreateModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreateScript}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">¿Eliminar Espectáculo?</h2>
            <p style={{ marginBottom: 16, color: '#ccc' }}>Esta acción no se puede deshacer.</p>
            <div className="modal-actions">
              <button className="btn" onClick={handleCancelDelete}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleConfirmDelete(deleteConfirmId)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={'toast toast-' + toast.type}>{toast.message}</div>}
    </div>
  );
}