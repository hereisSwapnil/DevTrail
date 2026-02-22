import { usePlaylist } from '@/context/PlaylistContext';
import { Playlist } from '@/types/playlist';
import { CheckCircle2, Circle, Clock, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoCardProps {
  playlist: Playlist;
  index?: number;
}

export function VideoCard({ playlist, index = 0 }: VideoCardProps) {
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
      className="group relative rounded-lg border border-border bg-card overflow-hidden transition-all hover:border-primary/30 hover:glow-primary animate-scale-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {video.thumbnail && (
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
        </div>
      )}

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
            {video.url ? (
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-sm font-mono font-semibold hover:text-primary hover:underline transition-colors leading-tight ${isCompleted ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}
              >
                {playlist.title}
              </a>
            ) : (
              <span className={`text-sm font-mono font-semibold leading-tight ${isCompleted ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}>
                {playlist.title}
              </span>
            )}
            {!video.thumbnail && video.duration && (
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{video.duration}</p>
            )}
            {isCompleted && video.completedAt && (
              <p className="text-[10px] text-success/70 font-mono mt-0.5">
                ✓ {new Date(video.completedAt).toLocaleDateString()}
              </p>
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
          <div className="flex items-center gap-1">
            {video.url && (
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${playlist.title} in new tab`}
                className="p-1.5 rounded text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
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
    </div>
  );
}
