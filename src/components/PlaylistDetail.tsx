import { useState } from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { Playlist, Video, VideoStatus } from '@/types/playlist';
import { ArrowLeft, Plus, CheckCircle2, Circle, Clock, ExternalLink, Trash2, Link, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { fetchUrlMetadata } from '@/lib/url-fetcher';
import { toast } from 'sonner';

interface PlaylistDetailProps {
  playlist: Playlist;
  onBack: () => void;
}

type SortMode = 'default' | 'status' | 'completed_date';

const statusOrder: Record<VideoStatus, number> = { not_started: 0, in_progress: 1, completed: 2 };

export function PlaylistDetail({ playlist, onBack }: PlaylistDetailProps) {
  const { getPlaylistStats, toggleVideoStatus, addVideo, deleteVideo, updatePlaylist, markPlaylistCompleted, deletePlaylist } = usePlaylist();
  const { total, completed, percent } = getPlaylistStats(playlist);
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(playlist.title);
  const [editDesc, setEditDesc] = useState(playlist.description || '');

  // Add video dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchedThumbnail, setFetchedThumbnail] = useState('');

  const sortedVideos = [...playlist.videos].sort((a, b) => {
    if (sortMode === 'status') return statusOrder[a.status] - statusOrder[b.status];
    if (sortMode === 'completed_date') {
      if (!a.completedAt) return 1;
      if (!b.completedAt) return -1;
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    }
    return 0;
  });

  const handleFetchUrl = async () => {
    if (!newUrl.trim()) return;
    setIsFetching(true);
    const result = await fetchUrlMetadata(newUrl.trim());
    setIsFetching(false);

    if (result.type === 'video') {
      setNewTitle(result.data.title);
      setFetchedThumbnail(result.data.thumbnail || '');
      if (result.data.duration) setNewDuration(result.data.duration);
      toast.success('Video info fetched!');
    } else if (result.type === 'playlist') {
      // Add all videos from playlist at once
      result.data.videos.forEach(v => {
        addVideo(playlist.id, { title: v.title, url: undefined, thumbnail: v.thumbnail, duration: v.duration });
      });
      setNewUrl('');
      setAddOpen(false);
      toast.success(`Added ${result.data.videos.length} videos from playlist`);
    } else {
      toast.error(result.message);
    }
  };

  const handleAddVideo = () => {
    if (!newTitle.trim()) return;
    addVideo(playlist.id, { title: newTitle.trim(), url: newUrl.trim() || undefined, duration: newDuration.trim() || undefined, thumbnail: fetchedThumbnail || undefined });
    setNewTitle('');
    setNewUrl('');
    setNewDuration('');
    setFetchedThumbnail('');
    setAddOpen(false);
  };

  const handleSaveEdit = () => {
    updatePlaylist(playlist.id, { title: editTitle, description: editDesc || undefined });
    setIsEditing(false);
  };

  const statusIcon = (status: VideoStatus) => {
    if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (status === 'in_progress') return <Clock className="h-4 w-4 text-warning" />;
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {isEditing ? (
          <div className="flex-1 flex gap-2">
            <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="flex-1 h-8 text-sm" />
            <Button size="sm" onClick={handleSaveEdit} className="h-8">Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-8">Cancel</Button>
          </div>
        ) : (
          <h2 className="font-mono font-bold text-lg cursor-pointer hover:text-primary transition-colors" onClick={() => setIsEditing(true)}>
            {playlist.title}
          </h2>
        )}
      </div>

      {isEditing && (
        <Input
          value={editDesc}
          onChange={e => setEditDesc(e.target.value)}
          placeholder="Description (optional)"
          className="mb-4 h-8 text-sm"
        />
      )}

      <div className="flex items-center gap-4 mb-6 p-4 rounded-lg bg-secondary/50">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">{completed}/{total} completed</span>
            <span className="text-sm font-mono text-primary font-semibold">{percent}%</span>
          </div>
          <Progress value={percent} className="h-2" />
        </div>
        <Button size="sm" variant="outline" onClick={() => markPlaylistCompleted(playlist.id)} className="text-xs whitespace-nowrap">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Complete all
        </Button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {(['default', 'status', 'completed_date'] as SortMode[]).map(mode => (
            <Button
              key={mode}
              size="sm"
              variant={sortMode === mode ? 'default' : 'ghost'}
              onClick={() => setSortMode(mode)}
              className="text-[10px] h-7 px-2 uppercase tracking-wider"
            >
              {mode === 'default' ? 'Order' : mode === 'status' ? 'Status' : 'Date'}
            </Button>
          ))}
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Add Video
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-mono">Add Video</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Paste YouTube/Vimeo URL" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="flex-1" />
                <Button variant="outline" size="sm" onClick={handleFetchUrl} disabled={isFetching || !newUrl.trim()} className="shrink-0">
                  {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
                </Button>
              </div>
              {fetchedThumbnail && (
                <img src={fetchedThumbnail} alt="Thumbnail" className="w-full h-32 object-cover rounded-md" />
              )}
              <Input placeholder="Video title *" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              <Input placeholder="Duration, e.g. 12:30 (optional)" value={newDuration} onChange={e => setNewDuration(e.target.value)} />
              <Button onClick={handleAddVideo} disabled={!newTitle.trim()} className="w-full">Add Video</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-1">
        {sortedVideos.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-12">No videos yet. Add one to get started.</p>
        )}
        {sortedVideos.map((video, i) => (
          <div
            key={video.id}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-secondary/50 transition-colors animate-slide-in"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <button onClick={() => toggleVideoStatus(playlist.id, video.id)} className="shrink-0 transition-transform hover:scale-110">
              {statusIcon(video.status)}
            </button>
            {video.thumbnail && (
              video.url ? (
                <a href={video.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="shrink-0" aria-label={`Open ${video.title} in new tab`}>
                  <img src={video.thumbnail} alt={`Thumbnail for ${video.title}`} className="h-9 w-16 object-cover rounded hover:opacity-80 transition-opacity" />
                </a>
              ) : (
                <img src={video.thumbnail} alt={`Thumbnail for ${video.title}`} className="h-9 w-16 object-cover rounded shrink-0" />
              )
            )}
            <div className="flex-1 min-w-0">
              {video.url ? (
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className={`text-sm hover:text-primary hover:underline transition-colors ${video.status === 'completed' ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}
                >
                  {video.title}
                </a>
              ) : (
                <span className={`text-sm ${video.status === 'completed' ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}>
                  {video.title}
                </span>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                {video.duration && <span className="text-[10px] text-muted-foreground font-mono">{video.duration}</span>}
                {video.completedAt && (
                  <span className="text-[10px] text-success/70 font-mono">
                    ✓ {new Date(video.completedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            {video.url && (
              <a href={video.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="shrink-0 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              onClick={() => deleteVideo(playlist.id, video.id)}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
