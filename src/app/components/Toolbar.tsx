import { Plus } from 'lucide-react';
import { NoteType, noteLabels, noteColors } from '../types';

interface ToolbarProps {
  onAddNote: (type: NoteType) => void;
  onAddLine: () => void;
  onAddContext: () => void;
  onClear: () => void;
  relevantNotes?: NoteType[];
  highlightPivotalLine?: boolean;
}

export function Toolbar({ onAddNote, onAddLine, onAddContext, onClear, relevantNotes = [], highlightPivotalLine = false }: ToolbarProps) {
  const noteTypes: NoteType[] = [
    'event',
    'command',
    'aggregate',
    'policy',
    'external',
    'user',
    'read-model',
    'issue',
  ];

  const isRelevant = (type: NoteType) => {
    if (relevantNotes.length === 0) return false;
    return relevantNotes.includes(type);
  };

  return (
    <div className="fixed top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs z-10">
      <h2 className="font-semibold mb-3 text-gray-800">Event Storming</h2>
      <div className="space-y-2 mb-4">
        {noteTypes.map((type) => {
          const relevant = isRelevant(type);
          return (
            <button
              key={type}
              onClick={() => onAddNote(type)}
              className={`w-full ${noteColors[type]} hover:opacity-80 px-3 py-2 rounded flex items-center gap-2 transition-all text-sm font-medium text-gray-800 ${
                relevant ? 'ring-2 ring-blue-500 ring-offset-2 scale-105 shadow-lg' : ''
              }`}
            >
              <Plus className="size-4" />
              {noteLabels[type]}
            </button>
          );
        })}
        <button
          onClick={onAddLine}
          className={`w-full bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded flex items-center gap-2 transition-all text-sm font-medium ${
            highlightPivotalLine ? 'ring-2 ring-blue-500 ring-offset-2 scale-105 shadow-lg' : ''
          }`}
        >
          <Plus className="size-4" />
          Pivotal Line
        </button>
        <button
          onClick={onAddContext}
          className="w-full border-4 border-dashed border-purple-400 bg-white hover:bg-purple-50 text-purple-700 px-3 py-2 rounded flex items-center gap-2 transition-all text-sm font-medium"
        >
          <Plus className="size-4" />
          Bounded Context
        </button>
      </div>
      <button
        onClick={onClear}
        className="w-full bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded text-sm font-medium text-gray-800 transition-colors"
      >
        Clear All
      </button>
    </div>
  );
}