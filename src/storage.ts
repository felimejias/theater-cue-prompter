import type { TheaterScript, TheaterSettings, TheaterRole, TheaterCue, TheaterAct, TheaterScene } from './types';
import { DEFAULT_SETTINGS, DEFAULT_ROLES, CUE_TYPES, SAMPLE_SCRIPT } from './types';

const SCRIPTS_KEY = 'theater_cue_prompter_scripts';
const SETTINGS_KEY = 'theater_cue_prompter_settings';
const SELECTED_SCRIPT_KEY = 'theater_cue_prompter_selected_script';

export function loadScripts(): TheaterScript[] {
  try {
    const stored = localStorage.getItem(SCRIPTS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to load scripts:', e);
  }
  return [SAMPLE_SCRIPT];
}

export function saveScripts(scripts: TheaterScript[]): void {
  try {
    localStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts));
  } catch (e) {
    console.error('Failed to save scripts:', e);
  }
}

export function loadSettings(): TheaterSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: TheaterSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function loadSelectedScriptId(): string | null {
  try {
    return localStorage.getItem(SELECTED_SCRIPT_KEY);
  } catch (e) {
    console.error('Failed to load selected script:', e);
  }
  return null;
}

export function saveSelectedScriptId(id: string | null): void {
  try {
    if (id) localStorage.setItem(SELECTED_SCRIPT_KEY, id);
    else localStorage.removeItem(SELECTED_SCRIPT_KEY);
  } catch (e) {
    console.error('Failed to save selected script:', e);
  }
}

export function createScript(title: string): TheaterScript {
  return {
    id: crypto.randomUUID(),
    title,
    author: '',
    acts: [],
    roles: DEFAULT_ROLES.map(r => ({ ...r })),
    cues: [],
    settings: { ...DEFAULT_SETTINGS },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function createCue(script: TheaterScript, type: TheaterCue['type']): TheaterCue {
  const typeConfig = CUE_TYPES.find(c => c.id === type) || CUE_TYPES[0];
  const existingNumbers = script.cues.filter(c => c.type === type).map(c => c.number);
  let nextNum = 1;
  while (existingNumbers.includes(`${typeConfig.label.split(' ')[0]} ${nextNum}`)) {
    nextNum++;
  }
  return {
    id: crypto.randomUUID(),
    number: `${typeConfig.label.split(' ')[0]} ${nextNum}`,
    type,
    trigger: 'manual',
    description: '',
    status: 'pending',
    order: script.cues.length + 1,
  };
}

export function createAct(title: string): TheaterAct {
  return {
    id: crypto.randomUUID(),
    title,
    scenes: [],
    order: 0,
  };
}

export function createScene(title: string): TheaterScene {
  return {
    id: crypto.randomUUID(),
    title,
    content: '',
    cues: [],
    order: 0,
  };
}

export function createRole(name: string, color: string): TheaterRole {
  return {
    id: crypto.randomUUID(),
    name,
    color,
    abbreviation: name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3),
  };
}