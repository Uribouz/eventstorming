import { useState } from 'react';
import { Edit2 } from 'lucide-react';

export function WorkshopTitle() {
  const [title, setTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-10">
      <div className="bg-white rounded-lg shadow-lg px-6 py-3 min-w-[400px]">
        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setIsEditing(false);
              }
            }}
            placeholder="Enter workshop topic..."
            className="w-full text-xl font-semibold text-gray-900 border-none outline-none bg-transparent text-center"
            autoFocus
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span className="text-xl font-semibold text-gray-900">
              {title || 'Click to add workshop topic'}
            </span>
            <Edit2 className="size-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </div>
    </div>
  );
}
