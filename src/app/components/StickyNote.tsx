import { useRef, useState, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { X, ArrowRight } from 'lucide-react';
import { StickyNote as StickyNoteType, noteColors, noteSizes } from '../types';

interface StickyNoteProps {
  note: StickyNoteType;
  onDelete: (id: string) => void;
  onUpdate: (id: string, text: string) => void;
  onUpdateHeight?: (id: string, height: number) => void;
  isSelected?: boolean;
  onSelect?: (id: string, addToSelection: boolean) => void;
  onStartArrow?: (id: string) => void;
  selectedNoteIds?: Set<string>;
  onEditStart?: (id: string) => void;
  onEditEnd?: (id: string) => void;
}

export function StickyNote({ note, onDelete, onUpdate, onUpdateHeight, isSelected, onSelect, onStartArrow, selectedNoteIds, onEditStart, onEditEnd }: StickyNoteProps) {
  const [isResizing, setIsResizing] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // Keep a ref so the useDrag item callback always reads the latest selection
  const selectedNoteIdsRef = useRef(selectedNoteIds);
  useEffect(() => {
    selectedNoteIdsRef.current = selectedNoteIds;
  }, [selectedNoteIds]);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'note',
    item: () => {
      const ids = selectedNoteIdsRef.current;
      return {
        id: note.id,
        selectedIds: ids && ids.has(note.id) ? Array.from(ids) : [note.id],
      };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [note.id]);

  const isAggregate = note.type === 'aggregate';
  const isIssue = note.type === 'issue';
  const defaultHeight = isAggregate ? 128 : undefined;
  const currentHeight = note.height || defaultHeight;

  const handleMouseDown = (e: React.MouseEvent) => {
    // Handle selection
    if (onSelect && !isResizing) {
      const addToSelection = e.shiftKey || e.ctrlKey || e.metaKey;
      // If this note is already part of a multi-selection and no modifier key is
      // held, do NOT clear the selection here. Clearing it would happen before
      // react-dnd fires dragstart, so the drag item would only ever see a single
      // note and the group would never move together.
      if (addToSelection || !isSelected) {
        onSelect(note.id, addToSelection);
      }
    }

    // Handle resize for aggregates
    if (isAggregate && e.target instanceof HTMLElement && e.target.classList.contains('resize-handle')) {
      e.stopPropagation();
      e.preventDefault();
      setIsResizing(true);
      startYRef.current = e.clientY;
      startHeightRef.current = currentHeight || 128;
    }
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startYRef.current;
      const newHeight = Math.max(128, startHeightRef.current + deltaY);
      if (onUpdateHeight) {
        onUpdateHeight(note.id, newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, note.id, onUpdateHeight]);

  const heightStyle = isAggregate ? { height: `${currentHeight}px` } : {};
  const transformStyle = isIssue ? 'rotate-45' : '';
  const contentTransformStyle = isIssue ? '-rotate-45' : '';

  return (
    <div
      ref={drag}
      onMouseDown={handleMouseDown}
      data-is-note="true"
      className={`absolute ${noteColors[note.type]} ${noteSizes[note.type]} p-3 rounded shadow-md cursor-move group hover:shadow-lg transition-all flex flex-col ${transformStyle} ${
        isSelected ? 'ring-4 ring-blue-500 ring-offset-2' : ''
      }`}
      style={{
        left: note.x,
        top: note.y,
        opacity: isDragging ? 0.5 : 1,
        zIndex: 10,
        ...heightStyle,
      }}
    >
      <div className="absolute -top-2 -right-2 flex gap-1 z-20">
        {onStartArrow && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartArrow(note.id);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Create arrow to another note"
          >
            <ArrowRight className="size-3" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id);
          }}
          className="bg-gray-800 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="size-3" />
        </button>
      </div>
      <textarea
        value={note.text}
        onChange={(e) => onUpdate(note.id, e.target.value)}
        onFocus={() => onEditStart?.(note.id)}
        onBlur={() => onEditEnd?.(note.id)}
        className={`w-full h-full bg-transparent border-none outline-none resize-none font-medium text-sm ${contentTransformStyle}`}
        placeholder="Type here..."
        onClick={(e) => e.stopPropagation()}
      />
      {isAggregate && (
        <div
          className="resize-handle absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-4 bg-yellow-600 hover:bg-yellow-700 rounded-full cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ bottom: '-8px' }}
        />
      )}
    </div>
  );
}