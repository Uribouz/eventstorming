import { useRef, useState, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { X } from 'lucide-react';
import { PivotalLine as PivotalLineType } from '../types';

interface PivotalLineProps {
  line: PivotalLineType;
  onDelete: (id: string) => void;
  onUpdateHeight: (id: string, height: number) => void;
}

export function PivotalLine({ line, onDelete, onUpdateHeight }: PivotalLineProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'line',
    item: { id: line.id, x: line.x, y: line.y },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.classList.contains('resize-handle')) {
      e.stopPropagation();
      e.preventDefault();
      setIsResizing(true);
      startYRef.current = e.clientY;
      startHeightRef.current = line.height;
    }
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startYRef.current;
      const newHeight = Math.max(100, startHeightRef.current + deltaY);
      onUpdateHeight(line.id, newHeight);
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
  }, [isResizing, line.id, onUpdateHeight]);

  return (
    <div
      ref={drag}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: `${line.x}px`,
        top: `${line.y}px`,
        height: `${line.height}px`,
        width: '6px',
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: 1,
      }}
      className="group"
    >
      <div className="relative h-full">
        <div className="absolute inset-0 bg-gray-800 rounded-sm shadow-lg" />
        
        {isHovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(line.id);
            }}
            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-colors z-10"
          >
            <X className="size-3" />
          </button>
        )}
        
        <div
          className="resize-handle absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-4 bg-gray-600 hover:bg-gray-700 rounded-full cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ bottom: '-8px' }}
        />
      </div>
    </div>
  );
}