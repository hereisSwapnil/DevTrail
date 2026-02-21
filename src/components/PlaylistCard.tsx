import { usePlaylist } from '@/context/PlaylistContext';
import { Playlist } from '@/types/playlist';
import { CheckCircle2, ExternalLink, Play, Trash2, MoreHorizontal } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface PlaylistCardProps {
  playlist: Playlist;
  onOpen: (id: string) => void;
}

export function PlaylistCard({ playlist, onOpen }: PlaylistCardProps) {
  const { getPlaylistStats, deletePlaylist, markPlaylistCompleted } = usePlaylist();
  const { total, completed, percent } = getPlaylistStats(playlist);
  const isComplete = total > 0 && completed === total;

  return (
    <div
      className="group relative rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/30 hover:glow-primary cursor-pointer animate-fade-in"
      onClick={() => onOpen(playlist.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-mono font-semibold text-card-foreground truncate text-sm">
            {playlist.title}
          </h3>
          {playlist.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{playlist.description}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => markPlaylistCompleted(playlist.id)}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark all completed
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => deletePlaylist(playlist.id)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete playlist
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Play className="h-3 w-3" />
          <span>{completed}/{total} videos</span>
          {isComplete && (
            <span className="ml-auto text-success font-mono text-[10px] uppercase tracking-wider">Done</span>
          )}
        </div>
        <Progress value={percent} className="h-1.5" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-primary">{percent}%</span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(playlist.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
