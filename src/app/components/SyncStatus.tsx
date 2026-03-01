import { Cloud, CloudOff, Users } from 'lucide-react';

interface SyncStatusProps {
  isSyncing: boolean;
  isLoading: boolean;
  isOnline: boolean;
}

export function SyncStatus({ isSyncing, isLoading, isOnline }: SyncStatusProps) {
  if (isLoading) {
    return (
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 z-50">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
        <span className="text-sm text-gray-600">Loading board...</span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-3 z-50">
      <div className="flex items-center gap-2">
        {isSyncing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
            <span className="text-sm text-gray-600">Syncing...</span>
          </>
        ) : isOnline ? (
          <>
            <Cloud className="size-4 text-green-500" />
            <span className="text-sm text-gray-600">Synced</span>
          </>
        ) : (
          <>
            <CloudOff className="size-4 text-orange-500" />
            <span className="text-sm text-gray-600">Offline (Local Only)</span>
          </>
        )}
      </div>
      {isOnline && (
        <>
          <div className="w-px h-6 bg-gray-300" />
          <div className="flex items-center gap-2">
            <Users className="size-4 text-blue-500" />
            <span className="text-sm text-gray-600">Collaborative</span>
          </div>
        </>
      )}
    </div>
  );
}