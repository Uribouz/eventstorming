import { useRef, useState, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { X } from 'lucide-react';
import { BoundedContext as BoundedContextType } from '../types';

interface BoundedContextProps {
  context: BoundedContextType;
  onDelete: (id: string) => void;
  onUpdate: (id: string, label: string) => void;
  onResize: (id: string, width: number, height: number) => void;
}

export function BoundedContext({ context, onDelete, onUpdate, onResize }: BoundedContextProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startSizeRef = useRef({ width: 0, height: 0 });

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'context',
    item: { id: context.id, x: context.x, y: context.y },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.classList.contains('resize-handle')) {
      e.stopPropagation();
      e.preventDefault();
      setIsResizing(true);
      startPosRef.current = { x: e.clientX, y: e.clientY };
      startSizeRef.current = { width: context.width, height: context.height };
    }
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;
      const newWidth = Math.max(200, startSizeRef.current.width + deltaX);
      const newHeight = Math.max(200, startSizeRef.current.height + deltaY);
      onResize(context.id, newWidth, newHeight);
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
  }, [isResizing, context.id, onResize]);

  return (
    <div
      ref={drag}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: `${context.x}px`,
        top: `${context.y}px`,
        width: `${context.width}px`,
        height: `${context.height}px`,
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: 2,
      }}
      className="group"
    >
      <div className="relative w-full h-full border-4 border-dashed border-purple-400 rounded-lg bg-transparent">
        <div className="absolute -top-8 left-4 bg-white px-2 py-1 rounded shadow-sm">
          <input
            type="text"
            value={context.label}
            onChange={(e) => onUpdate(context.id, e.target.value)}
            className="bg-transparent border-none outline-none font-semibold text-sm text-purple-700"
            placeholder="Bounded Context"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        
        {isHovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(context.id);
            }}
            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-colors z-10"
          >
            <X className="size-3" />
          </button>
        )}
        
        <div
          className="resize-handle absolute bottom-0 right-0 w-6 h-6 bg-purple-400 hover:bg-purple-500 rounded-tl-lg cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
    </div>
  );
}
