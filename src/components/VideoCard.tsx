import { usePlaylist } from '@/context/PlaylistContext';
import { Playlist } from '@/types/playlist';
import { CheckCircle2, Circle, Clock, Trash2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoCardProps {
  playlist: Playlist;
  index?: number;
  onOpen: (id: string) => void;
}

export function VideoCard({ playlist, index = 0, onOpen }: VideoCardProps) {
  const { toggleVideoStatus, deletePlaylist } = usePlaylist();
  const video = playlist.videos[0];

  if (!video) return null;

  const isCompleted = video.status === 'completed';
  const isInProgress = video.status === 'in_progress';

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleVideoStatus(playlist.id, video.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deletePlaylist(playlist.id);
  };

  return (
    <div
      className={`group relative rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-primary/40 hover:shadow-lg animate-scale-in ${video.url ? 'cursor-pointer' : ''}`}
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={() => video.url && onOpen(playlist.id)}
    >
      {/* Thumbnail */}
      {video.thumbnail ? (
        <div className="relative w-full h-32 overflow-hidden bg-secondary">
          <img
            src={video.thumbnail}
            alt={`Thumbnail for ${video.title}`}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
          />
          {video.duration && (
            <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
              {video.duration}
            </span>
          )}
          {isCompleted && (
            <div className="absolute inset-0 bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-success/80" />
            </div>
          )}
          {video.url && !isCompleted && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
              <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-xl">
                <Play className="h-5 w-5 text-primary-foreground fill-primary-foreground ml-0.5" />
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className="p-4">
        <div className="flex items-start gap-2 mb-3">
          <button
            onClick={handleToggle}
            className="shrink-0 mt-0.5 transition-transform hover:scale-110"
            aria-label={isCompleted ? 'Mark as not started' : 'Mark as completed'}
          >
            {isCompleted
              ? <CheckCircle2 className="h-4 w-4 text-success" />
              : isInProgress
              ? <Clock className="h-4 w-4 text-warning" />
              : <Circle className="h-4 w-4 text-muted-foreground" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-mono font-semibold leading-tight ${isCompleted ? 'line-through text-muted-foreground' : 'text-card-foreground group-hover:text-primary transition-colors'}`}>
              {playlist.title}
            </p>
            {!video.thumbnail && video.duration && (
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{video.duration}</p>
            )}
            {isCompleted && video.completedAt && (
              <p className="text-[10px] text-success/70 font-mono mt-0.5">
                ✓ {new Date(video.completedAt).toLocaleDateString()}
              </p>
            )}
            {isInProgress && (
              <p className="text-[10px] text-warning font-mono mt-0.5">In progress</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant={isCompleted ? 'outline' : 'default'}
            onClick={handleToggle}
            className="h-7 text-[10px] px-3"
          >
            {isCompleted ? 'Completed ✓' : 'Mark Complete'}
          </Button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
            aria-label={`Delete ${playlist.title}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
