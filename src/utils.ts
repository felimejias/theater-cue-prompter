import type { TheaterScript, TheaterCue, TheaterAct, TheaterScene } from './types';
import { CUE_TYPES } from './types';

export { CUE_TYPES } from './types';

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function getCueTypeConfig(type: TheaterCue['type']) {
  return CUE_TYPES.find(c => c.id === type) || CUE_TYPES[0];
}

export function getCueStatusColor(status: TheaterCue['status']): string {
  switch (status) {
    case 'pending': return 'var(--cue-pending)';
    case 'active': return 'var(--cue-active)';
    case 'complete': return 'var(--cue-complete)';
    case 'skipped': return 'var(--cue-skipped)';
    default: return 'var(--cue-pending)';
  }
}

export function downloadFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportScriptJSON(script: TheaterScript): string {
  return JSON.stringify(script, null, 2);
}

export function exportScriptCSV(script: TheaterScript): string {
  const headers = ['Number', 'Type', 'Trigger', 'Description', 'Notes', 'Role', 'Duration', 'Status'];
  const rows = script.cues.map(cue => {
    const typeConfig = getCueTypeConfig(cue.type);
    const role = script.roles?.find(r => r.id === cue.role);
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
  });
  return [headers.join(','), ...rows].join('\n');
}

export function exportCueSheet(script: TheaterScript): string {
  const lines = [
    `HOJA DE CUES - ${script.title}`,
    `Autor: ${script.author || 'Desconocido'}`,
    `Fecha: ${new Date().toLocaleDateString('es-ES')}`,
    '',
    '=== LISTA DE CUES ===',
    '',
  ];

  script.cues.forEach(cue => {
    const typeConfig = getCueTypeConfig(cue.type);
    const role = script.roles?.find(r => r.id === cue.role);
    lines.push(
      `${cue.number} | ${typeConfig.label} | ${cue.trigger.toUpperCase()}`,
      `  Descripción: ${cue.description}`,
      cue.notes ? `  Notas: ${cue.notes}` : '',
      role ? `  Responsable: ${role.name} (${role.abbreviation})` : '',
      cue.duration ? `  Duración: ${cue.duration}s` : '',
      `  Estado: ${cue.status.toUpperCase()}`,
      '',
    );
  });

  lines.push('=== ESTRUCTURA DE LA OBRA ===', '');
  script.acts.forEach(act => {
    lines.push(`ACTO ${act.order}: ${act.title}`);
    act.scenes.forEach(scene => {
      lines.push(`  Escena ${scene.order}: ${scene.title}`);
      if (scene.cues.length > 0) {
        lines.push(`    Cues: ${scene.cues.join(', ')}`);
      }
    });
    lines.push('');
  });

  return lines.join('\n');
}

export function generateScriptFilename(script: TheaterScript, ext: string): string {
  const title = script.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${title}.${ext}`;
}

export function renumberCues(cues: TheaterCue[]): TheaterCue[] {
  const byType = new Map<TheaterCue['type'], number>();
  return cues.map(cue => {
    const count = byType.get(cue.type) || 0;
    byType.set(cue.type, count + 1);
    const typeConfig = getCueTypeConfig(cue.type);
    const prefix = typeConfig.label.split(' ')[0];
    return { ...cue, number: `${prefix} ${count + 1}` };
  });
}

export function sortCuesByOrder(cues: TheaterCue[]): TheaterCue[] {
  return [...cues].sort((a, b) => a.order - b.order);
}

export function sortActsByOrder(acts: TheaterAct[]): TheaterAct[] {
  return [...acts].sort((a, b) => a.order - b.order);
}

export function sortScenesByOrder(scenes: TheaterScene[]): TheaterScene[] {
  return [...scenes].sort((a, b) => a.order - b.order);
}