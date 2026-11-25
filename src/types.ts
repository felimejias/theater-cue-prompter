export interface TheaterRole {
  id: string;
  name: string;
  color: string;
  abbreviation: string; // 2-3 chars for compact display
}

export interface TheaterCue {
  id: string;
  number: string; // e.g., "LX 1", "SQ 3", "CUE 12"
  type: 'lighting' | 'sound' | 'stage' | 'projection' | 'custom';
  trigger: 'manual' | 'time' | 'line' | 'follow';
  time?: number; // seconds from start (for time triggers)
  line?: string; // line text for line triggers
  description: string;
  notes?: string;
  role?: string; // responsible role
  duration?: number; // fade duration in seconds
  status: 'pending' | 'active' | 'complete' | 'skipped';
  order: number;
}

export interface TheaterScript {
  id: string;
  title: string;
  author: string;
  acts: TheaterAct[];
  roles: TheaterRole[];
  cues: TheaterCue[];
  settings: TheaterSettings;
  createdAt: number;
  updatedAt: number;
}

export interface TheaterAct {
  id: string;
  title: string;
  scenes: TheaterScene[];
  order: number;
}

export interface TheaterScene {
  id: string;
  title: string;
  content: string; // dialogue/stage directions
  cues: string[]; // cue IDs that belong to this scene
  order: number;
}

export interface TheaterSettings {
  theme: 'dark' | 'light' | 'auto';
  fontSize: number;
  lineHeight: number;
  showCueNumbers: boolean;
  showCueTypes: boolean;
  compactMode: boolean;
  autoAdvance: boolean;
  cueWarningTime: number; // seconds before cue
  showTimer: boolean;
  timerMode: 'elapsed' | 'remaining' | 'cue';
}

export const DEFAULT_ROLES: TheaterRole[] = [
  { id: 'sm', name: 'Stage Manager', color: '#ff6b6b', abbreviation: 'SM' },
  { id: 'ld', name: 'Lighting Designer', color: '#ffd93d', abbreviation: 'LD' },
  { id: 'sd', name: 'Sound Designer', color: '#6bcb77', abbreviation: 'SD' },
  { id: 'pd', name: 'Projection Designer', color: '#4d96ff', abbreviation: 'PD' },
  { id: 'asm', name: 'Assistant SM', color: '#ff9f43', abbreviation: 'ASM' },
];

export const DEFAULT_SETTINGS: TheaterSettings = {
  theme: 'dark',
  fontSize: 16,
  lineHeight: 1.8,
  showCueNumbers: true,
  showCueTypes: true,
  compactMode: false,
  autoAdvance: false,
  cueWarningTime: 10,
  showTimer: true,
  timerMode: 'elapsed',
};

export const CUE_TYPES = [
  { id: 'lighting', label: 'Luz (LX)', color: '#ffd93d', icon: '💡' },
  { id: 'sound', label: 'Sonido (SQ)', color: '#6bcb77', icon: '🔊' },
  { id: 'stage', label: 'Escena', color: '#ff9f43', icon: '🎭' },
  { id: 'projection', label: 'Proyección', color: '#4d96ff', icon: '📽️' },
  { id: 'custom', label: 'Otro', color: '#a55eea', icon: '⚙️' },
] as const;

export const SAMPLE_SCRIPT: TheaterScript = {
  id: 'sample-1',
  title: 'Ejemplo: Hamlet - Acto 1',
  author: 'William Shakespeare',
  roles: DEFAULT_ROLES,
  settings: DEFAULT_SETTINGS,
  acts: [
    {
      id: 'act-1',
      title: 'Acto 1',
      order: 1,
      scenes: [
        {
          id: 'scene-1-1',
          title: 'Escena 1 - El Castillo de Elsinor',
          order: 1,
          content: `FRANCISCO: ¿Quién está ahí?
BERNARDO: ¡Largo! ¿Quién eres?
FRANCISCO: Francisco.
BERNARDO: Bienvenido, Francisco.`,
          cues: ['cue-1', 'cue-2'],
        },
        {
          id: 'scene-1-2',
          title: 'Escena 2 - La Aparición',
          order: 2,
          content: `HORACIO: ¿Qué es esto?
MARCELO: El fantasma del rey.
HORACIO: ¡Mira! ¿No se parece al rey muerto?`,
          cues: ['cue-3'],
        },
      ],
    },
  ],
  cues: [
    {
      id: 'cue-1',
      number: 'LX 1',
      type: 'lighting',
      trigger: 'manual',
      description: 'Fade in - Luz tenue de luna',
      notes: 'Canal 1-4 @ 30%',
      role: 'ld',
      duration: 5,
      status: 'pending',
      order: 1,
    },
    {
      id: 'cue-2',
      number: 'SQ 1',
      type: 'sound',
      trigger: 'line',
      line: '¿Quién está ahí?',
      description: 'Viento nocturno + cuervo',
      notes: 'Track 1, nivel -12dB',
      role: 'sd',
      duration: 3,
      status: 'pending',
      order: 2,
    },
    {
      id: 'cue-3',
      number: 'LX 2',
      type: 'lighting',
      trigger: 'manual',
      description: 'Efecto fantasma - strobe suave',
      notes: 'Canal 10-12, 2Hz',
      role: 'ld',
      duration: 2,
      status: 'pending',
      order: 3,
    },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};