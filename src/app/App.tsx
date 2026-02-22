import { useState, useCallback, useRef } from 'react';
import { DndProvider, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { StickyNote } from './components/StickyNote';
import { PivotalLine } from './components/PivotalLine';
import { ArrowLine } from './components/ArrowLine';
import { BoundedContext } from './components/BoundedContext';
import { Toolbar } from './components/Toolbar';
import { WorkshopTimer } from './components/WorkshopTimer';
import { WorkshopTitle } from './components/WorkshopTitle';
import { StickyNote as StickyNoteType, PivotalLine as PivotalLineType, ArrowLine as ArrowLineType, BoundedContext as BoundedContextType, NoteType } from './types';

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
  const selectionStartRef = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

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
    // Cancel arrow creation if clicking on canvas
    if (arrowStartId !== null && (e.target === e.currentTarget || (e.target as HTMLElement).closest('.canvas-content'))) {
      setArrowStartId(null);
    }

    // Only start selection if clicking on canvas background
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.canvas-content')) {
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
            <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
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