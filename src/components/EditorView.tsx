import { useState, useEffect, useCallback, useMemo } from 'react';
import type { TheaterScript, TheaterCue, TheaterAct, TheaterScene, TheaterRole, TheaterSettings } from '../types';
import { loadSettings, saveSettings } from '../storage';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { formatTime, getCueTypeConfig, getCueStatusColor, downloadFile, exportCueSheet, generateScriptFilename } from '../utils';
import { CUE_TYPES } from '../types';

interface EditorViewProps {
  script: TheaterScript;
  onExit: () => void;
  onScriptUpdate: (script: TheaterScript) => void;
}

export function EditorView({ script, onExit, onScriptUpdate }: EditorViewProps) {
  const [settings, setSettings] = useState<TheaterSettings>(() => loadSettings());
  const [cues, setCues] = useState<TheaterCue[]>(script.cues);
  const [acts, setActs] = useState<TheaterAct[]>(script.acts);
  const [roles, setRoles] = useState<TheaterRole[]>(script.roles);
  const [activeTab, setActiveTab] = useState<'cues' | 'script' | 'cuesheet'>('cues');
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null);
  const [editingCueId, setEditingCueId] = useState<string | null>(null);
  const [showCueModal, setShowCueModal] = useState(false);
  const [showActModal, setShowActModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'cuesheet'>('json');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const sortedCues = useMemo(() => [...cues].sort((a, b) => a.order - b.order), [cues]);
  const selectedCue = cues.find(c => c.id === selectedCueId);
  const typeConfig = getCueTypeConfig(selectedCue?.type || 'lighting');
  const role = selectedCue?.role ? roles.find(r => r.id === selectedCue.role) : null;

  // Persist settings
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Sync with script
  useEffect(() => {
    onScriptUpdate({ ...script, cues, acts, roles, settings, updatedAt: Date.now() });
  }, [cues, acts, roles, settings, script, onScriptUpdate]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Keyboard shortcuts
  const handleNextCue = useCallback(() => {
    const idx = sortedCues.findIndex(c => c.id === selectedCueId);
    if (idx < sortedCues.length - 1) setSelectedCueId(sortedCues[idx + 1].id);
  }, [sortedCues, selectedCueId]);

  const handlePrevCue = useCallback(() => {
    const idx = sortedCues.findIndex(c => c.id === selectedCueId);
    if (idx > 0) setSelectedCueId(sortedCues[idx - 1].id);
  }, [sortedCues, selectedCueId]);

  const handleGoCue = useCallback((num: number) => {
    if (num > 0 && num <= sortedCues.length) {
      setSelectedCueId(sortedCues[num - 1].id);
    }
  }, [sortedCues]);

  const handleMarkComplete = useCallback(() => {
    if (selectedCueId) {
      setCues(current => current.map(c => c.id === selectedCueId ? { ...c, status: c.status === 'complete' ? 'pending' : 'complete' } : c));
    }
  }, [selectedCueId]);

  const handleMarkSkipped = useCallback(() => {
    if (selectedCueId) {
      setCues(current => current.map(c => c.id === selectedCueId ? { ...c, status: c.status === 'skipped' ? 'pending' : 'skipped' } : c));
    }
  }, [selectedCueId]);

  useKeyboardShortcuts({
    enabled: true,
    onNextCue: handleNextCue,
    onPrevCue: handlePrevCue,
    onGoCue: handleGoCue,
    onMarkComplete: handleMarkComplete,
    onMarkSkipped: handleMarkSkipped,
    onUndo: () => {},
    onSave: () => setToast({ message: 'Guardado', type: 'info' }),
  });

  // Cue management
  const handleAddCue = useCallback((type: TheaterCue['type'] = 'lighting') => {
    const newCue: TheaterCue = {
      id: crypto.randomUUID(),
      number: '',
      type,
      trigger: 'manual',
      description: 'Nueva cue',
      status: 'pending',
      order: cues.length + 1,
    };
    setCues(current => [...current, newCue].map((c, i) => ({ ...c, order: i + 1 })));
    setToast({ message: 'Cue agregada', type: 'success' });
    setTimeout(() => setToast(null), 3000);
  }, [cues]);

  const handleDeleteCue = useCallback((id: string) => {
    setCues(current => current.filter(c => c.id !== id).map((c, i) => ({ ...c, order: i + 1 })));
    setSelectedCueId(prev => prev === id ? null : prev);
    setToast({ message: 'Cue eliminada', type: 'success' });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleCueUpdate = useCallback((id: string, field: keyof TheaterCue, value: any) => {
    setCues(current => current.map(c => c.id === id ? { ...c, [field]: value } : c));
  }, []);

  const handleCueStatusChange = useCallback((id: string, status: TheaterCue['status']) => {
    setCues(current => current.map(c => c.id === id ? { ...c, status } : c));
  }, []);

  const handleOpenCueModal = useCallback((cue?: TheaterCue) => {
    if (cue) setEditingCueId(cue.id);
    else setEditingCueId(null);
    setShowCueModal(true);
  }, []);

  const handleSaveCue = useCallback(() => {
    setShowCueModal(false);
    setEditingCueId(null);
  }, []);

  // Act/Scene management
  const handleAddAct = useCallback(() => {
    const newAct: TheaterAct = {
      id: crypto.randomUUID(),
      title: `Acto ${acts.length + 1}`,
      scenes: [],
      order: acts.length + 1,
    };
    setActs(current => [...current, newAct]);
    setToast({ message: 'Acto agregado', type: 'success' });
    setTimeout(() => setToast(null), 3000);
  }, [acts]);

  const handleAddScene = useCallback((actId: string) => {
    const act = acts.find(a => a.id === actId);
    if (!act) return;
    const newScene: TheaterScene = {
      id: crypto.randomUUID(),
      title: `Escena ${act.scenes.length + 1}`,
      content: '',
      cues: [],
      order: act.scenes.length + 1,
    };
    setActs(current => current.map(a => a.id === actId ? { ...a, scenes: [...a.scenes, newScene] } : a));
    setToast({ message: 'Escena agregada', type: 'success' });
    setTimeout(() => setToast(null), 3000);
  }, [acts]);

  const handleActUpdate = useCallback((actId: string, field: keyof TheaterAct, value: any) => {
    setActs(current => current.map(a => a.id === actId ? { ...a, [field]: value } : a));
  }, []);

  const handleSceneUpdate = useCallback((actId: string, sceneId: string, field: keyof TheaterScene, value: any) => {
    setActs(current => current.map(a => a.id === actId ? {
      ...a, scenes: a.scenes.map(s => s.id === sceneId ? { ...s, [field]: value } : s)
    } : a));
  }, []);

  const handleDeleteAct = useCallback((actId: string) => {
    setActs(current => current.filter(a => a.id !== actId));
  }, []);

  const handleDeleteScene = useCallback((actId: string, sceneId: string) => {
    setActs(current => current.map(a => a.id === actId ? { ...a, scenes: a.scenes.filter(s => s.id !== sceneId) } : a));
  }, []);

  // Role management
  const handleAddRole = useCallback(() => {
    const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff9f43', '#a55eea', '#ff6bff', '#6bffff'];
    const usedColors = roles.map(r => r.color);
    const availableColor = colors.find(c => !usedColors.includes(c)) || '#888888';
    const newRole: TheaterRole = {
      id: crypto.randomUUID(),
      name: `Rol ${roles.length + 1}`,
      color: availableColor,
      abbreviation: `R${roles.length + 1}`,
    };
    setRoles(current => [...current, newRole]);
    setToast({ message: 'Rol agregado', type: 'success' });
    setTimeout(() => setToast(null), 3000);
  }, [roles]);

  const handleRoleUpdate = useCallback((roleId: string, field: keyof TheaterRole, value: any) => {
    setRoles(current => current.map(r => r.id === roleId ? { ...r, [field]: value } : r));
  }, []);

  const handleDeleteRole = useCallback((roleId: string) => {
    setRoles(current => current.filter(r => r.id !== roleId));
    setCues(current => current.map(c => c.role === roleId ? { ...c, role: undefined } : c));
  }, []);

  // Export
  const handleExport = useCallback(() => {
    let content: string;
    let filename: string;
    let type: string;

    switch (exportFormat) {
      case 'json':
        content = JSON.stringify({ ...script, cues, acts, roles }, null, 2);
        filename = generateScriptFilename(script, 'json');
        type = 'application/json';
        break;
      case 'csv':
        content = cues.map(cue => {
          const typeConfig = CUE_TYPES.find(t => t.id === cue.type) || CUE_TYPES[0];
          const role = roles.find(r => r.id === cue.role);
          return [
            cue.number,
            typeConfig.label,
            cue.trigger,
            `"${cue.description.replace(/"/g, '""')}"`,
            `"${(cue.notes || '').replace(/"/g, '""')}"`,
            role?.name || '',
            cue.duration ? `${cue.duration}s` : '',
            cue.status,
          ].join(',');
        }).join('\n');
        filename = generateScriptFilename(script, 'csv');
        type = 'text/csv';
        break;
      case 'cuesheet':
        content = exportCueSheet({ ...script, cues, acts, roles });
        filename = generateScriptFilename(script, 'txt');
        type = 'text/plain';
        break;
    }

    downloadFile(filename, content, type);
    setToast({ message: `Exportado como ${exportFormat.toUpperCase()}`, type: 'success' });
    setTimeout(() => setToast(null), 3000);
    setShowExportModal(false);
  }, [script, cues, acts, roles, exportFormat]);

  const typeConfig = getCueTypeConfig(selectedCue?.type || 'lighting');
  const role = selectedCue?.role ? roles.find(r => r.id === selectedCue.role) : null;

  return (
    <div className="editor-area" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="header-title">{script.title}</span>
          {script.author && <span style={{ fontSize: 12, color: 'var(--muted)', padding: '2px 8px', background: 'var(--bg)', borderRadius: '4px' }}>por {script.author}</span>}
        </div>
        <div className="header-actions">
          <select className="btn" value={settings.theme} onChange={e => setSettings(s => ({ ...s, theme: e.target.value as any }))} style={{ padding: '4px 8px', fontSize: 11 }}>
            <option value="dark">🌙</option>
            <option value="light">☀️</option>
            <option value="auto">💻</option>
          </select>
          <button className="btn btn-sm" onClick={() => setShowExportModal(true)}>Exportar</button>
          <button className="btn btn-sm btn-danger" onClick={onExit}>Cerrar</button>
        </div>
      </header>

      <div className="timer-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cues Totales</span>
          <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>{cues.length}</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>|</span>
          <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 600, color: 'var(--success)' }}>{cues.filter(c => c.status === 'complete').length}</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>completadas</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-sm" onClick={() => handleAddCue()}>+ Cue</button>
          <select className="btn btn-sm" style={{ padding: '4px 8px', fontSize: 11 }} onChange={e => handleAddCue(e.target.value as TheaterCue['type'])}>
            <option value="">+ Tipo...</option>
            <option value="lighting">💡 Luz (LX)</option>
            <option value="sound">🔊 Sonido (SQ)</option>
            <option value="stage">🎭 Escena</option>
            <option value="projection">📽️ Proyección</option>
            <option value="custom">⚙️ Otro</option>
          </select>
          <button className="btn btn-sm" onClick={() => setShowActModal(true)}>+ Acto</button>
          <button className="btn btn-sm" onClick={() => setShowRoleModal(true)}>Roles</button>
        </div>
      </div>

      <div className="main" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <aside className="sidebar" style={{ width: 340, minWidth: 300 }}>
          <div className="sidebar-tabs">
            <button className={`sidebar-tab ${activeTab === 'cues' ? 'active' : ''}`} onClick={() => setActiveTab('cues')}>📋 Cues</button>
            <button className={`sidebar-tab ${activeTab === 'script' ? 'active' : ''}`} onClick={() => setActiveTab('script')}>📖 Guion</button>
            <button className={`sidebar-tab ${activeTab === 'cuesheet' ? 'active' : ''}`} onClick={() => setActiveTab('cuesheet')}>📄 Hoja</button>
          </div>
          <div className="sidebar-content">
            {activeTab === 'cues' && (
              <div style={{ padding: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '32px 70px 1fr 70px 60px', gap: 6, fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
                  <div></div>
                  <div>NÚM.</div>
                  <div>DESCRIPCIÓN</div>
                  <div>TRIGGER</div>
                  <div>ESTADO</div>
                </div>
                <div style={{ maxHeight: 'calc(100% - 50px)', overflowY: 'auto' }}>
                  {cues.map((cue) => {
                    const typeConfig = CUE_TYPES.find(t => t.id === cue.type) || CUE_TYPES[0];
                    return (
                      <div
                        key={cue.id}
                        className={`cue-tree-item ${cue.id === selectedCueId ? 'active' : ''} status-${cue.status}`}
                        onClick={() => setSelectedCueId(cue.id)}
                        style={{ borderLeftColor: typeConfig.color }}
                      >
                        <div className="cue-type-badge" style={{ background: typeConfig.color }}>{typeConfig.icon}</div>
                        <span className="cue-number">{cue.number}</span>
                        <span className="cue-desc" title={cue.description}>{cue.description}</span>
                        <span className="cue-trigger">{cue.trigger === 'line' && cue.line ? `línea: "${cue.line.slice(0, 20)}..."` : cue.trigger}</span>
                        <div className="cue-status" style={{ background: getCueStatusColor(cue.status) }}></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'script' && (
              <div style={{ padding: 8 }}>
                {script.acts.map(act => (
                  <div key={act.id} style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>{act.title}</div>
                    {act.scenes.map(scene => (
                      <div key={scene.id} style={{ marginLeft: 16, marginBottom: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', marginBottom: 8 }}>{scene.title}</div>
                        <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 8 }}>{scene.content}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                          Cues: {scene.cues.length > 0 ? scene.cues.map(cid => cues.find(c => c.id === cid)?.number).filter(Boolean).join(', ') : 'Ninguna'}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'cuesheet' && (
              <div style={{ padding: 16, fontSize: 11, fontFamily: 'monospace', lineHeight: 1.8, maxHeight: '100%', overflow: 'auto' }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--accent)' }}>HOJA DE CUES - {script.title}</div>
                <div style={{ color: 'var(--muted)', marginBottom: 16 }}>Total: {cues.length} cues | {cues.filter(c => c.status === 'complete').length} completadas</div>
                {cues.map(cue => {
                  const typeConfig = CUE_TYPES.find(t => t.id === cue.type) || CUE_TYPES[0];
                  return (
                    <div key={cue.id} style={{ padding: '4px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: typeConfig.color, fontWeight: 700, minWidth: 50 }}>{cue.number}</span>
                      <span style={{ flex: 1 }}>{cue.description}</span>
                      <span style={{ color: 'var(--muted)', fontSize: 10 }}>{cue.trigger.toUpperCase()}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <div className="editor-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {selectedCue ? (
            <div style={{ width: 380, borderLeft: '1px solid var(--border)', background: 'var(--card)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: 16, borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{selectedCue.number}</span>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, color: '#000', textTransform: 'uppercase', background: typeConfig.color }}>{typeConfig.label}</span>
                  </div>
                  <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 11 }}>
                    Orden: {selectedCue.order} de {cues.length} | {selectedCue.trigger === 'line' && selectedCue.line ? `Línea: "${selectedCue.line.slice(0, 40)}..."` : selectedCue.trigger.toUpperCase()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-sm" onClick={handlePrevCue} title="Anterior (←/↑)">↑</button>
                  <button className="btn btn-sm" onClick={handleNextCue} title="Siguiente (→/↓/Espacio)">↓</button>
                  <button className="btn btn-sm" onClick={() => setCues(current => current.map(c => c.id === selectedCueId ? { ...c, status: c.status === 'complete' ? 'pending' : 'complete' } : c))} title="Completar (C)">
                    {selectedCue.status === 'complete' ? '✓' : '○'}
                  </button>
                  <button className="btn btn-sm" onClick={() => setCues(current => current.map(c => c.id === selectedCueId ? { ...c, status: c.status === 'skipped' ? 'pending' : 'skipped' } : c))} title="Saltar (S)">
                    {selectedCue.status === 'skipped' ? '↷' : '⊘'}
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Descripción</div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{selectedCue.description || '<sin descripción>'}</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Notas</div>
                  <div>{selectedCue.notes || '<sin notas>'}</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Trigger</div>
                  <div>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--bg)', padding: '4px 8px', borderRadius: 4, display: 'inline-block' }}>{selectedCue.trigger.toUpperCase()}</span>
                    {selectedCue.trigger === 'line' && selectedCue.line && <div style={{ marginTop: 4, fontSize: 12, color: 'var(--muted)' }}>Línea: "{selectedCue.line}"</div>}
                    {selectedCue.trigger === 'time' && selectedCue.time && <div style={{ marginTop: 4, fontSize: 12, color: 'var(--muted)' }}>Tiempo: {formatTime(selectedCue.time)}</div>}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Responsable</div>
                    <div>{role ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: role.color }}></span>{role.name} ({role.abbreviation})</span> : <span style={{ color: 'var(--muted)' }}>Sin asignar</span>}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Duración</div>
                    <div>{selectedCue.duration ? `${selectedCue.duration}s` : '—'}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Estado</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(['pending', 'active', 'complete', 'skipped'] as TheaterCue['status'][]).map(s => (
                      <button
                        key={s}
                        className={`btn btn-sm ${selectedCue.status === s ? 'active' : ''}`}
                        onClick={() => setCues(current => current.map(c => c.id === selectedCueId ? { ...c, status: s } : c))}
                        style={{ background: selectedCue.status === s ? getCueStatusColor(s) : 'var(--card)', color: selectedCue.status === s ? '#000' : 'var(--fg)', borderColor: selectedCue.status === s ? getCueStatusColor(s) : 'var(--border)' }}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-sm" onClick={() => setSelectedCueId(null)}>Cerrar</button>
                <button className="btn btn-sm" onClick={() => { setEditingCueId(selectedCue.id); setShowCueModal(true); }}>Editar</button>
                <button className="btn btn-sm btn-danger" onClick={() => { setCues(current => current.filter(c => c.id !== selectedCueId)); setSelectedCueId(null); }}>Eliminar</button>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎭</div>
              <h3 style={{ marginBottom: 8 }}>Selecciona una cue</h3>
              <p style={{ fontSize: 14 }}>Haz clic en una cue de la lista lateral para ver sus detalles y editarla.</p>
              <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                <button className="btn btn-primary" onClick={() => setCues(current => [...current, { id: crypto.randomUUID(), number: '', type: 'lighting', trigger: 'manual', description: 'Nueva cue', status: 'pending', order: cues.length + 1 }].map((c, i) => ({ ...c, order: i + 1 })))}>+ Primera Cue</button>
                <button className="btn" onClick={() => setActiveTab('script')}>Ver Guion</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cue Modal */}
      {showCueModal && (
        <div className="modal-overlay" onClick={() => { setShowCueModal(false); setEditingCueId(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2 className="modal-title">{editingCueId ? 'Editar Cue' : 'Nueva Cue'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Número</span>
                <input className="modal-input" value={selectedCue?.number || ''} onChange={e => setCues(current => current.map(c => c.id === editingCueId ? { ...c, number: e.target.value } : c))} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipo</span>
                <select className="modal-select" value={selectedCue?.type || 'lighting'} onChange={e => setCues(current => current.map(c => c.id === editingCueId ? { ...c, type: e.target.value } : c))}>
                  <option value="lighting">💡 Luz (LX)</option>
                  <option value="sound">🔊 Sonido (SQ)</option>
                  <option value="stage">🎭 Escena</option>
                  <option value="projection">📽️ Proyección</option>
                  <option value="custom">⚙️ Otro</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descripción</span>
                <input className="modal-input" value={selectedCue?.description || ''} onChange={e => setCues(current => current.map(c => c.id === editingCueId ? { ...c, description: e.target.value } : c))} placeholder="Descripción de la cue" />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notas</span>
                <textarea className="modal-textarea" value={selectedCue?.notes || ''} onChange={e => setCues(current => current.map(c => c.id === editingCueId ? { ...c, notes: e.target.value } : c))} placeholder="Notas técnicas, canales, niveles, etc." />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trigger</span>
                <select className="modal-select" value={selectedCue?.trigger || 'manual'} onChange={e => setCues(current => current.map(c => c.id === editingCueId ? { ...c, trigger: e.target.value } : c))}>
                  <option value="manual">Manual</option>
                  <option value="line">Por Línea</option>
                  <option value="time">Por Tiempo</option>
                  <option value="follow">Follow (auto)</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Línea (si trigger=line)</span>
                <input className="modal-input" value={selectedCue?.line || ''} onChange={e => setCues(current => current.map(c => c.id === editingCueId ? { ...c, line: e.target.value } : c))} placeholder='Texto exacto de la línea' />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tiempo (si trigger=time)</span>
                <input className="modal-input" type="number" value={selectedCue?.time || ''} onChange={e => setCues(current => current.map(c => c.id === editingCueId ? { ...c, time: parseFloat(e.target.value) || undefined } : c))} placeholder="Segundos desde inicio" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Responsable</span>
                <select className="modal-select" value={selectedCue?.role || ''} onChange={e => setCues(current => current.map(c => c.id === editingCueId ? { ...c, role: e.target.value || undefined } : c))}>
                  <option value="">Sin asignar</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name} ({r.abbreviation})</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duración (seg)</span>
                <input className="modal-input" type="number" value={selectedCue?.duration || ''} onChange={e => setCues(current => current.map(c => c.id === editingCueId ? { ...c, duration: parseFloat(e.target.value) || undefined } : c))} placeholder="Duración fade/efecto" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</span>
                <select className="modal-select" value={selectedCue?.status || 'pending'} onChange={e => setCues(current => current.map(c => c.id === editingCueId ? { ...c, status: e.target.value } : c))}>
                  <option value="pending">Pendiente</option>
                  <option value="active">Activa</option>
                  <option value="complete">Completada</option>
                  <option value="skipped">Saltada</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => { setShowCueModal(false); setEditingCueId(null); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => { setShowCueModal(false); setEditingCueId(null); }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Act Modal */}
      {showActModal && (
        <div className="modal-overlay" onClick={() => setShowActModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="modal-title" style={{ margin: 0 }}>Gestionar Actos y Escenas</h2>
              <button className="btn btn-sm btn-primary" onClick={() => setActs(current => [...current, { id: crypto.randomUUID(), title: `Acto ${acts.length + 1}`, scenes: [], order: acts.length + 1 }])}>+ Acto</button>
            </div>
            {acts.map(act => (
              <div key={act.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <input className="modal-input" value={act.title} onChange={e => setActs(current => current.map(a => a.id === act.id ? { ...a, title: e.target.value } : a))} style={{ flex: 1, minWidth: 200, marginBottom: 0 }} />
                  <button className="btn btn-sm btn-primary" onClick={() => setActs(current => current.map(a => a.id === act.id ? { ...a, scenes: [...a.scenes, { id: crypto.randomUUID(), title: `Escena ${a.scenes.length + 1}`, content: '', cues: [], order: a.scenes.length + 1 }] } : a))}>+ Escena</button>
                  <button className="btn btn-sm btn-danger" onClick={() => setActs(current => current.filter(a => a.id !== act.id))} disabled={acts.length <= 1}>Eliminar Acto</button>
                </div>
                {act.scenes.map(scene => (
                  <div key={scene.id} style={{ marginLeft: 20, padding: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <input className="modal-input" value={scene.title} onChange={e => setActs(current => current.map(a => a.id === act.id ? { ...a, scenes: a.scenes.map(s => s.id === scene.id ? { ...s, title: e.target.value } : s) } : a))} style={{ flex: 1, minWidth: 200, marginBottom: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>{scene.cues.length} cues vinculadas</span>
                      <button className="btn btn-sm btn-danger" onClick={() => setActs(current => current.map(a => a.id === act.id ? { ...a, scenes: a.scenes.filter(s => s.id !== scene.id) } : a))}>Eliminar</button>
                    </div>
                    <textarea className="modal-textarea" value={scene.content} onChange={e => setActs(current => current.map(a => a.id === act.id ? { ...a, scenes: a.scenes.map(s => s.id === scene.id ? { ...s, content: e.target.value } : s) } : a))} placeholder="Diálogo, acotaciones, movimientos..." style={{ fontSize: 12 }} />
                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
                      Cues en esta escena: {scene.cues.length > 0 ? scene.cues.map(cid => cues.find(c => c.id === cid)?.number).filter(Boolean).join(', ') : 'Ninguna'}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="modal-title" style={{ margin: 0 }}>Gestionar Roles</h2>
              <button className="btn btn-sm btn-primary" onClick={() => {
                const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff9f43', '#a55eea', '#ff6bff', '#6bffff'];
                const usedColors = roles.map(r => r.color);
                const availableColor = colors.find(c => !usedColors.includes(c)) || '#888888';
                setRoles(current => [...current, { id: crypto.randomUUID(), name: `Rol ${roles.length + 1}`, color: availableColor, abbreviation: `R${roles.length + 1}` }]);
              }}>+ Rol</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '50vh', overflow: 'auto' }}>
              {roles.map(role => (
                <div key={role.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <input type="color" value={role.color} onChange={e => setRoles(current => current.map(r => r.id === role.id ? { ...r, color: e.target.value } : r))} style={{ width: 32, height: 32, border: '2px solid var(--border)', borderRadius: 6, cursor: 'pointer' }} />
                  <input className="modal-input" value={role.name} onChange={e => setRoles(current => current.map(r => r.id === role.id ? { ...r, name: e.target.value } : r))} style={{ flex: 1, marginBottom: 0 }} />
                  <input className="modal-input" value={role.abbreviation} onChange={e => setRoles(current => current.map(r => r.id === role.id ? { ...r, abbreviation: e.target.value } : r))} style={{ width: 80, textAlign: 'center', fontFamily: 'monospace', fontWeight: 600, marginBottom: 0 }} />
                  <button className="btn btn-sm btn-danger" onClick={() => setRoles(current => current.filter(r => r.id !== role.id))} disabled={roles.length <= 1}>Eliminar</button>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowRoleModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Exportar Espectáculo</h2>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <label style={{ flex: 1 }}>
                <input type="radio" name="export-format" value="json" checked={exportFormat === 'json'} onChange={() => setExportFormat('json')} style={{ marginRight: 8 }} />
                JSON - Backup completo
              </label>
              <label style={{ flex: 1 }}>
                <input type="radio" name="export-format" value="csv" checked={exportFormat === 'csv'} onChange={() => setExportFormat('csv')} style={{ marginRight: 8 }} />
                CSV - Lista de cues para Excel
              </label>
              <label style={{ flex: 1 }}>
                <input type="radio" name="export-format" value="cuesheet" checked={exportFormat === 'cuesheet'} onChange={() => setExportFormat('cuesheet')} style={{ marginRight: 8 }} />
                Hoja de Cues - Para imprimir
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowExportModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => {
                let content = '';
                let filename = '';
                let type = '';
                if (exportFormat === 'json') {
                  content = JSON.stringify({ ...script, cues, acts, roles }, null, 2);
                  filename = generateScriptFilename(script, 'json');
                  type = 'application/json';
                } else if (exportFormat === 'csv') {
                  content = cues.map(cue => {
                    const typeConfig = CUE_TYPES.find(t => t.id === cue.type) || CUE_TYPES[0];
                    const role = roles.find(r => r.id === cue.role);
                    return [
                      cue.number,
                      typeConfig.label,
                      cue.trigger,
                      `"${cue.description.replace(/"/g, '""')}"`,
                      `"${(cue.notes || '').replace(/"/g, '""')}"`,
                      role?.name || '',
                      cue.duration ? `${cue.duration}s` : '',
                      cue.status,
                    ].join(',');
                  }).join('\n');
                  filename = generateScriptFilename(script, 'csv');
                  type = 'text/csv';
                } else {
                  content = exportCueSheet({ ...script, cues, acts, roles });
                  filename = generateScriptFilename(script, 'txt');
                  type = 'text/plain';
                }
                downloadFile(filename, content, type);
                setToast({ message: `Exportado como ${exportFormat.toUpperCase()}`, type: 'success' });
                setTimeout(() => setToast(null), 3000);
                setShowExportModal(false);
              }}>Exportar</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={'toast toast-' + toast.type}>{toast.message}</div>}

      <details className="shortcuts-help">
        <summary>Atajos de Teclado</summary>
        <div className="shortcuts-list">
          <kbd>Espacio / Enter / → / ↓</kbd><span>Siguiente cue</span>
          <kbd>← / ↑ / Shift+Enter</kbd><span>Cue anterior</span>
          <kbd>1-9</kbd><span>Ir a cue #</span>
          <kbd>C</kbd><span>Marcar completada</span>
          <kbd>S</kbd><span>Marcar saltada</span>
          <kbd>Ctrl+Z</kbd><span>Deshacer</span>
          <kbd>Ctrl+S</kbd><span>Guardar</span>
        </div>
      </details>
    </div>
  );
}