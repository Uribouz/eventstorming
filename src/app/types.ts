export type NoteType = 
  | 'event'
  | 'command'
  | 'aggregate'
  | 'policy'
  | 'external'
  | 'user'
  | 'read-model'
  | 'issue';

export interface StickyNote {
  id: string;
  type: NoteType;
  text: string;
  x: number;
  y: number;
  height?: number; // Optional custom height for aggregates
}

export interface PivotalLine {
  id: string;
  x: number;
  y: number;
  height: number;
}

export interface ArrowLine {
  id: string;
  fromId: string;
  toId: string;
}

export interface BoundedContext {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export const noteColors: Record<NoteType, string> = {
  event: 'bg-orange-300',
  command: 'bg-blue-300',
  aggregate: 'bg-yellow-200',
  policy: 'bg-purple-200',
  external: 'bg-pink-200',
  user: 'bg-yellow-100',
  'read-model': 'bg-green-200',
  issue: 'bg-red-200',
};

export const noteLabels: Record<NoteType, string> = {
  event: 'Event',
  command: 'Command',
  aggregate: 'Aggregate (Write Model)',
  policy: 'Policy',
  external: 'External System',
  user: 'User/Actor',
  'read-model': 'Read Model',
  issue: 'Issue/Question',
};

export const noteSizes: Record<NoteType, string> = {
  event: 'w-32 h-32',           // Large square (3x3 inches equivalent)
  command: 'w-32 h-32',          // Large square
  aggregate: 'w-32',             // Large width, height will be dynamic
  policy: 'w-32 h-32',           // Large square
  external: 'w-32 h-32',         // Large square
  user: 'w-20 h-20',             // Small square for actors
  'read-model': 'w-32 h-32',     // Large square
  issue: 'w-24 h-24',            // Medium square for issues/hotspots (will be rotated)
};