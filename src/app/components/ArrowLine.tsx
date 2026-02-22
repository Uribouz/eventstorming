import { X } from 'lucide-react';
import { ArrowLine as ArrowLineType, StickyNote, NoteType } from '../types';
import { useState } from 'react';

interface ArrowLineProps {
  arrow: ArrowLineType;
  notes: StickyNote[];
  onDelete: (id: string) => void;
}

// Pixel dimensions matching the Tailwind size classes in types.ts
const NOTE_WIDTHS: Record<NoteType, number> = {
  event: 128, command: 128, aggregate: 128, policy: 128,
  external: 128, user: 80, 'read-model': 128, issue: 96,
};
const NOTE_BASE_HEIGHTS: Record<NoteType, number> = {
  event: 128, command: 128, aggregate: 128, policy: 128,
  external: 128, user: 80, 'read-model': 128, issue: 96,
};

function getNoteSize(note: StickyNote) {
  return {
    width: NOTE_WIDTHS[note.type],
    height: note.type === 'aggregate' ? (note.height || NOTE_BASE_HEIGHTS.aggregate) : NOTE_BASE_HEIGHTS[note.type],
  };
}

/**
 * Given a rectangle (defined by its center and half-dimensions) and a direction
 * vector pointing outward, return the point where the ray exits the rectangle edge.
 */
function rectEdgePoint(
  cx: number, cy: number,
  hw: number, hh: number, // half-width, half-height
  dx: number, dy: number  // direction towards the OTHER note
): { x: number; y: number } {
  const eps = 1e-10;
  let tMin = Infinity;
  let ex = cx, ey = cy;

  if (dx > eps) {
    const t = hw / dx;
    const y = cy + t * dy;
    if (Math.abs(y - cy) <= hh + eps && t < tMin) { tMin = t; ex = cx + hw; ey = y; }
  } else if (dx < -eps) {
    const t = -hw / dx;
    const y = cy + t * dy;
    if (Math.abs(y - cy) <= hh + eps && t < tMin) { tMin = t; ex = cx - hw; ey = y; }
  }
  if (dy > eps) {
    const t = hh / dy;
    const x = cx + t * dx;
    if (Math.abs(x - cx) <= hw + eps && t < tMin) { tMin = t; ex = x; ey = cy + hh; }
  } else if (dy < -eps) {
    const t = -hh / dy;
    const x = cx + t * dx;
    if (Math.abs(x - cx) <= hw + eps && t < tMin) { tMin = t; ex = x; ey = cy - hh; }
  }

  return { x: ex, y: ey };
}

export function ArrowLine({ arrow, notes, onDelete }: ArrowLineProps) {
  const [isHovered, setIsHovered] = useState(false);

  const fromNote = notes.find(n => n.id === arrow.fromId);
  const toNote = notes.find(n => n.id === arrow.toId);

  if (!fromNote || !toNote) return null;

  const fromSize = getNoteSize(fromNote);
  const toSize = getNoteSize(toNote);

  // Centers
  const fromCx = fromNote.x + fromSize.width / 2;
  const fromCy = fromNote.y + fromSize.height / 2;
  const toCx = toNote.x + toSize.width / 2;
  const toCy = toNote.y + toSize.height / 2;

  // Direction vector (center → center)
  const dx = toCx - fromCx;
  const dy = toCy - fromCy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return null; // notes are on top of each other

  const ndx = dx / len;
  const ndy = dy / len;

  // Exit point on the "from" note edge (ray going towards toNote)
  const start = rectEdgePoint(fromCx, fromCy, fromSize.width / 2, fromSize.height / 2, ndx, ndy);
  // Entry point on the "to" note edge (ray going towards fromNote, i.e. opposite direction)
  const end = rectEdgePoint(toCx, toCy, toSize.width / 2, toSize.height / 2, -ndx, -ndy);

  return (
    <g
      style={{ pointerEvents: 'all' }}
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
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke="#374151"
        strokeWidth={isHovered ? 3 : 2}
        markerEnd={`url(#arrowhead-${arrow.id})`}
        className="transition-all"
      />

      {isHovered && (
        <g>
          <circle
            cx={(start.x + end.x) / 2}
            cy={(start.y + end.y) / 2}
            r="12"
            fill="white"
            stroke="#374151"
            strokeWidth="2"
          />
          <foreignObject
            x={(start.x + end.x) / 2 - 8}
            y={(start.y + end.y) / 2 - 8}
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
