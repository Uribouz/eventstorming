import { X } from 'lucide-react';
import { ArrowLine as ArrowLineType, StickyNote } from '../types';
import { useState } from 'react';

interface ArrowLineProps {
  arrow: ArrowLineType;
  notes: StickyNote[];
  onDelete: (id: string) => void;
}

export function ArrowLine({ arrow, notes, onDelete }: ArrowLineProps) {
  const [isHovered, setIsHovered] = useState(false);

  const fromNote = notes.find(n => n.id === arrow.fromId);
  const toNote = notes.find(n => n.id === arrow.toId);

  if (!fromNote || !toNote) return null;

  // Calculate center positions
  const fromX = fromNote.x + 64; // half of 128px width
  const fromY = fromNote.y + ((fromNote.height || 128) / 2);
  const toX = toNote.x + 64;
  const toY = toNote.y + ((toNote.height || 128) / 2);

  // Calculate arrow angle
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const arrowHeadSize = 12;

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <defs>
        <marker
          id={`arrowhead-${arrow.id}`}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="#374151" />
        </marker>
      </defs>
      
      <line
        x1={fromX}
        y1={fromY}
        x2={toX}
        y2={toY}
        stroke="#374151"
        strokeWidth={isHovered ? 3 : 2}
        markerEnd={`url(#arrowhead-${arrow.id})`}
        className="transition-all"
      />
      
      {isHovered && (
        <g>
          <circle
            cx={(fromX + toX) / 2}
            cy={(fromY + toY) / 2}
            r="12"
            fill="white"
            stroke="#374151"
            strokeWidth="2"
          />
          <foreignObject
            x={(fromX + toX) / 2 - 8}
            y={(fromY + toY) / 2 - 8}
            width="16"
            height="16"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(arrow.id);
              }}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 w-full h-full flex items-center justify-center"
            >
              <X className="size-3" />
            </button>
          </foreignObject>
        </g>
      )}
    </g>
  );
}
