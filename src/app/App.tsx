import { useState, useCallback, useRef, useEffect } from 'react';
import { DndProvider, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { StickyNote } from './components/StickyNote';
import { PivotalLine } from './components/PivotalLine';
import { ArrowLine } from './components/ArrowLine';
import { BoundedContext } from './components/BoundedContext';
import { Toolbar } from './components/Toolbar';
import { WorkshopTimer } from './components/WorkshopTimer';
import { WorkshopTitle } from './components/WorkshopTitle';
import { SyncStatus } from './components/SyncStatus';
import { StickyNote as StickyNoteType, PivotalLine as PivotalLineType, ArrowLine as ArrowLineType, BoundedContext as BoundedContextType, NoteType } from './types';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a79a26d0`;
const STORAGE_KEY = 'event-storming-canvas-local-backup';

interface SavedState {
  notes: StickyNoteType[];
  lines: PivotalLineType[];
  arrows: ArrowLineType[];
  contexts: BoundedContextType[];
}

function Canvas() {
  const [notes, setNotes] = useState<StickyNoteType[]>([]);
  const [lines, setLines] = useState<PivotalLineType[]>([]);
  const [arrows, setArrows] = useState<ArrowLineType[]>([]);
  const [contexts, setContexts] = useState<BoundedContextType[]>([]);
  const [relevantNotes, setRelevantNotes] = useState<NoteType[]>([]);
  const [highlightPivotalLine, setHighlightPivotalLine] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [arrowStartId, setArrowStartId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const selectionStartRef = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef(0);
  const saveTimeoutRef = useRef<number | null>(null);

  // Load from localStorage as backup
  const loadFromLocalStorage = useCallback((): SavedState => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
    return { notes: [], lines: [], arrows: [], contexts: [] };
  }, []);

  // Save to localStorage as backup
  const saveToLocalStorage = useCallback((state: SavedState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, []);

  // Load initial board state from server
  useEffect(() => {
    const loadBoard = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/board`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setNotes(data.notes || []);
          setLines(data.lines || []);
          setArrows(data.arrows || []);
          setContexts(data.contexts || []);
          setIsOnline(true);
          
          // Save to localStorage as backup
          saveToLocalStorage(data);
        } else {
          console.error('Failed to load board state from server, using local backup');
          const localData = loadFromLocalStorage();
          setNotes(localData.notes);
          setLines(localData.lines);
          setArrows(localData.arrows);
          setContexts(localData.contexts);
          setIsOnline(false);
        }
      } catch (error) {
        console.error('Error loading board state from server, using local backup:', error);
        const localData = loadFromLocalStorage();
        setNotes(localData.notes);
        setLines(localData.lines);
        setArrows(localData.arrows);
        setContexts(localData.contexts);
        setIsOnline(false);
      } finally {
        setIsLoading(false);
      }
    };
    loadBoard();
  }, [loadFromLocalStorage, saveToLocalStorage]);

  // Save board state to server with debouncing
  const saveToServer = useCallback(async (state: SavedState) => {
    // Always save to localStorage as backup
    saveToLocalStorage(state);

    try {
      setIsSyncing(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_BASE_URL}/board/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(state),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        lastTimestampRef.current = data.timestamp;
        setIsOnline(true);
      } else if (response.status === 503) {
        console.warn('Server temporarily unavailable (503), will retry later');
        setIsOnline(false);
      } else {
        console.warn('Failed to save to server, data saved locally');
        setIsOnline(false);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.warn('Request timed out, data saved locally');
      } else {
        console.warn('Server unavailable, data saved locally');
      }
      setIsOnline(false);
    } finally {
      setIsSyncing(false);
    }
  }, [saveToLocalStorage]);

  // Auto-save to server whenever state changes (with debouncing)
  useEffect(() => {
    if (isLoading) return; // Don't save during initial load

    // Clear existing timeout
    if (saveTimeoutRef.current !== null) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce saves to avoid too many requests
    saveTimeoutRef.current = window.setTimeout(() => {
      const saveState: SavedState = {
        notes,
        lines,
        arrows,
        contexts,
      };
      saveToServer(saveState);
    }, 500); // Wait 500ms after last change before saving

    return () => {
      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [notes, lines, arrows, contexts, isLoading, saveToServer]);

  // Poll for updates from other users
  useEffect(() => {
    if (isLoading || !isOnline) return;

    const pollInterval = setInterval(async () => {
      try {
        // First check if there's a new timestamp
        const timestampResponse = await fetch(`${API_BASE_URL}/board/timestamp`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });
        
        if (timestampResponse.ok) {
          const { timestamp } = await timestampResponse.json();
          
          // Only fetch the full board if timestamp has changed
          if (timestamp > lastTimestampRef.current) {
            const boardResponse = await fetch(`${API_BASE_URL}/board`, {
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
              },
            });
            
            if (boardResponse.ok) {
              const data = await boardResponse.json();
              setNotes(data.notes || []);
              setLines(data.lines || []);
              setArrows(data.arrows || []);
              setContexts(data.contexts || []);
              lastTimestampRef.current = timestamp;
              setIsOnline(true);
              
              // Update local backup
              saveToLocalStorage(data);
            }
          }
        }
      } catch (error) {
        // Silently handle polling errors, stay in offline mode
        setIsOnline(false);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [isLoading, isOnline, saveToLocalStorage]);

  const [, drop] = useDrop(() => ({
    accept: ['note', 'line', 'context'],
    drop: (item: { id: string; selectedIds?: string[] }, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (delta) {
        const itemType = monitor.getItemType();
        
        if (itemType === 'note') {
          // Get the list of note IDs to move
          const idsToMove = item.selectedIds || [item.id];
          
          setNotes((prevNotes) =>
            prevNotes.map((note) =>
              idsToMove.includes(note.id)
                ? { ...note, x: note.x + delta.x, y: note.y + delta.y }
                : note
            )
          );
        } else if (itemType === 'line') {
          setLines((prevLines) =>
            prevLines.map((line) =>
              line.id === item.id
                ? { ...line, x: line.x + delta.x, y: line.y + delta.y }
                : line
            )
          );
        } else if (itemType === 'context') {
          setContexts((prevContexts) =>
            prevContexts.map((ctx) =>
              ctx.id === item.id
                ? { ...ctx, x: ctx.x + delta.x, y: ctx.y + delta.y }
                : ctx
            )
          );
        }
      }
    },
  }));

  const addNote = useCallback((type: NoteType) => {
    const newNote: StickyNoteType = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      text: '',
      x: 400 + Math.random() * 200,
      y: 100 + Math.random() * 200,
    };
    setNotes((prev) => [...prev, newNote]);
  }, []);

  const addLine = useCallback(() => {
    const newLine: PivotalLineType = {
      id: Math.random().toString(36).substr(2, 9),
      x: 400 + Math.random() * 200,
      y: 100,
      height: 400,
    };
    setLines((prev) => [...prev, newLine]);
  }, []);

  const addContext = useCallback(() => {
    const newContext: BoundedContextType = {
      id: Math.random().toString(36).substr(2, 9),
      x: 400 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      width: 400,
      height: 300,
      label: 'Bounded Context',
    };
    setContexts((prev) => [...prev, newContext]);
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
    setSelectedNotes((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    // Delete arrows connected to this note
    setArrows((prev) => prev.filter((arrow) => arrow.fromId !== id && arrow.toId !== id));
  }, []);

  const deleteLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((line) => line.id !== id));
  }, []);

  const deleteArrow = useCallback((id: string) => {
    setArrows((prev) => prev.filter((arrow) => arrow.id !== id));
  }, []);

  const deleteContext = useCallback((id: string) => {
    setContexts((prev) => prev.filter((ctx) => ctx.id !== id));
  }, []);

  const updateNote = useCallback((id: string, text: string) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, text } : note))
    );
  }, []);

  const updateNoteHeight = useCallback((id: string, height: number) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, height } : note))
    );
  }, []);

  const updateLineHeight = useCallback((id: string, height: number) => {
    setLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, height } : line))
    );
  }, []);

  const updateContextLabel = useCallback((id: string, label: string) => {
    setContexts((prev) =>
      prev.map((ctx) => (ctx.id === id ? { ...ctx, label } : ctx))
    );
  }, []);

  const updateContextSize = useCallback((id: string, width: number, height: number) => {
    setContexts((prev) =>
      prev.map((ctx) => (ctx.id === id ? { ...ctx, width, height } : ctx))
    );
  }, []);

  const clearAll = useCallback(() => {
    if (confirm('Are you sure you want to clear all notes, lines, arrows, and contexts?')) {
      setNotes([]);
      setLines([]);
      setArrows([]);
      setContexts([]);
      setSelectedNotes(new Set());
    }
  }, []);

  const handlePhaseChange = useCallback((newRelevantNotes: NoteType[], isPivotalEvents: boolean) => {
    setRelevantNotes(newRelevantNotes);
    setHighlightPivotalLine(isPivotalEvents);
  }, []);

  const handleSelectNote = useCallback((id: string, addToSelection: boolean) => {
    setSelectedNotes((prev) => {
      const next = new Set(prev);
      if (addToSelection) {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleStartArrow = useCallback((fromId: string) => {
    if (arrowStartId === null) {
      setArrowStartId(fromId);
      // Visual feedback that we're in arrow creation mode
    } else {
      // Create arrow from arrowStartId to fromId
      if (arrowStartId !== fromId) {
        const newArrow: ArrowLineType = {
          id: Math.random().toString(36).substr(2, 9),
          fromId: arrowStartId,
          toId: fromId,
        };
        setArrows((prev) => [...prev, newArrow]);
      }
      setArrowStartId(null);
    }
  }, [arrowStartId]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // A click is "on a note" if the target is inside a note element
    const clickedOnNote = target.closest('[data-is-note]') !== null;

    // Cancel arrow creation only when clicking on the canvas background, not on a note
    if (arrowStartId !== null && !clickedOnNote) {
      setArrowStartId(null);
    }

    // Only start selection box when clicking on canvas background (not on a note)
    if (!clickedOnNote && (e.target === e.currentTarget || target.closest('.canvas-content'))) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        selectionStartRef.current = {
          x: e.clientX - rect.left + (e.currentTarget.scrollLeft || 0),
          y: e.clientY - rect.top + (e.currentTarget.scrollTop || 0),
        };
        setIsSelecting(true);
        setSelectionBox({ x: selectionStartRef.current.x, y: selectionStartRef.current.y, width: 0, height: 0 });
        // Clear selection if not holding shift/ctrl
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          setSelectedNotes(new Set());
        }
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isSelecting && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left + (e.currentTarget.scrollLeft || 0);
      const currentY = e.clientY - rect.top + (e.currentTarget.scrollTop || 0);
      
      const width = currentX - selectionStartRef.current.x;
      const height = currentY - selectionStartRef.current.y;
      
      setSelectionBox({
        x: width < 0 ? currentX : selectionStartRef.current.x,
        y: height < 0 ? currentY : selectionStartRef.current.y,
        width: Math.abs(width),
        height: Math.abs(height),
      });
    }
  };

  const handleCanvasMouseUp = () => {
    if (isSelecting) {
      // Select all notes within selection box
      const selected = new Set(selectedNotes);
      notes.forEach((note) => {
        const noteX = note.x;
        const noteY = note.y;
        const noteWidth = 128; // approximate
        const noteHeight = note.height || 128;
        
        // Check if note intersects with selection box
        if (
          noteX < selectionBox.x + selectionBox.width &&
          noteX + noteWidth > selectionBox.x &&
          noteY < selectionBox.y + selectionBox.height &&
          noteY + noteHeight > selectionBox.y
        ) {
          selected.add(note.id);
        }
      });
      setSelectedNotes(selected);
      setIsSelecting(false);
      setSelectionBox({ x: 0, y: 0, width: 0, height: 0 });
    }
  };

  return (
    <div className="size-full flex flex-col">
      <Toolbar 
        onAddNote={addNote} 
        onAddLine={addLine}
        onAddContext={addContext}
        onClear={clearAll} 
        relevantNotes={relevantNotes}
        highlightPivotalLine={highlightPivotalLine}
      />
      <WorkshopTimer onPhaseChange={handlePhaseChange} />
      <WorkshopTitle />
      <div
        ref={(node) => {
          drop(node);
          if (node) canvasRef.current = node;
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        className="flex-1 relative bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden"
      >
        <div className="canvas-content absolute inset-0 overflow-auto">
          <div className="relative min-w-full min-h-full">
            {/* Bounded contexts - lowest z-index */}
            {contexts.map((ctx) => (
              <BoundedContext
                key={ctx.id}
                context={ctx}
                onDelete={deleteContext}
                onUpdate={updateContextLabel}
                onResize={updateContextSize}
              />
            ))}
            
            {/* Pivotal lines */}
            {lines.map((line) => (
              <PivotalLine
                key={line.id}
                line={line}
                onDelete={deleteLine}
                onUpdateHeight={updateLineHeight}
              />
            ))}
            
            {/* SVG layer for arrows */}
            <svg className="absolute inset-0" style={{ zIndex: 5, width: '100%', height: '100%', pointerEvents: 'none' }}>
              {arrows.map((arrow) => (
                <ArrowLine
                  key={arrow.id}
                  arrow={arrow}
                  notes={notes}
                  onDelete={deleteArrow}
                />
              ))}
            </svg>
            
            {/* Sticky notes - highest z-index */}
            {notes.map((note) => (
              <StickyNote
                key={note.id}
                note={note}
                onDelete={deleteNote}
                onUpdate={updateNote}
                onUpdateHeight={updateNoteHeight}
                isSelected={selectedNotes.has(note.id)}
                onSelect={handleSelectNote}
                onStartArrow={handleStartArrow}
                selectedNoteIds={selectedNotes}
              />
            ))}
            
            {isSelecting && (
              <div
                className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-20 pointer-events-none"
                style={{
                  left: selectionBox.x,
                  top: selectionBox.y,
                  width: selectionBox.width,
                  height: selectionBox.height,
                  zIndex: 100,
                }}
              />
            )}
            
            {arrowStartId && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
                Click another note to create an arrow, or click canvas to cancel
              </div>
            )}
          </div>
        </div>
        {notes.length === 0 && lines.length === 0 && contexts.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-400 max-w-md">
              <h3 className="text-xl font-semibold mb-2">Start Event Storming</h3>
              <p className="text-sm">
                Click a note type from the toolbar to add sticky notes to the canvas.
                Drag them around to organize your domain events, commands, and more.
                Hold Shift/Ctrl and click to multi-select, or click and drag to create a selection box.
              </p>
            </div>
          </div>
        )}
      </div>
      <SyncStatus isSyncing={isSyncing} isLoading={isLoading} isOnline={isOnline} />
    </div>
  );
}

export default function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <Canvas />
    </DndProvider>
  );
}