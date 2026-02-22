import { useState, useEffect, useCallback } from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { Playlist, Video, VideoStatus } from '@/types/playlist';
import {
  ArrowLeft, Plus, CheckCircle2, Circle, Clock, Trash2, Link, Loader2,
  ChevronRight, ChevronLeft, SkipForward, ListVideo, LayoutList, ExternalLink
} from 'lucide-react';
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
import { VideoPlayer } from '@/components/VideoPlayer';
import { VideoNotes } from '@/components/VideoNotes';

interface PlaylistDetailProps {
  playlist: Playlist;
  onBack: () => void;
}

type SortMode = 'default' | 'status' | 'completed_date';
type ViewMode = 'list' | 'player';

const statusOrder: Record<VideoStatus, number> = { not_started: 0, in_progress: 1, completed: 2 };

export function PlaylistDetail({ playlist, onBack }: PlaylistDetailProps) {
  const { getPlaylistStats, toggleVideoStatus, setVideoStatus, addVideo, deleteVideo, updatePlaylist, markPlaylistCompleted } = usePlaylist();
  const { total, completed, percent } = getPlaylistStats(playlist);

  const isSingleVideo = !!playlist.isSingleVideo;
  const firstVideo = playlist.videos[0];

  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [viewMode, setViewMode] = useState<ViewMode>(isSingleVideo && firstVideo?.url ? 'player' : 'list');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(isSingleVideo && firstVideo?.url ? firstVideo.id : null);
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

  const activeVideo = activeVideoId ? playlist.videos.find(v => v.id === activeVideoId) : null;
  const activeIndex = sortedVideos.findIndex(v => v.id === activeVideoId);

  const openVideo = useCallback((video: Video) => {
    setActiveVideoId(video.id);
    setViewMode('player');
    // Auto-mark as in_progress when first opened
    if (video.status === 'not_started') {
      setVideoStatus(playlist.id, video.id, 'in_progress');
    }
  }, [playlist.id, setVideoStatus]);

  const goToNext = useCallback(() => {
    if (activeIndex < sortedVideos.length - 1) {
      openVideo(sortedVideos[activeIndex + 1]);
    }
  }, [activeIndex, sortedVideos, openVideo]);

  const goToPrev = useCallback(() => {
    if (activeIndex > 0) {
      openVideo(sortedVideos[activeIndex - 1]);
    }
  }, [activeIndex, sortedVideos, openVideo]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Global escape key to go back to dashboard
      if (e.key === 'Escape') {
        onBack();
        return;
      }
      
      if (viewMode !== 'player') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' || e.key === 'n') goToNext();
      if (e.key === 'ArrowLeft' || e.key === 'p') goToPrev();
      if (e.key === 'c' && activeVideo) toggleVideoStatus(playlist.id, activeVideo.id);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [viewMode, goToNext, goToPrev, activeVideo, playlist.id, toggleVideoStatus, onBack]);

  const handleAddVideoAutomatically = async () => {
    if (!newUrl.trim()) return;
    setIsFetching(true);
    const result = await fetchUrlMetadata(newUrl.trim());
    setIsFetching(false);

    if (result.type === 'video') {
      addVideo(playlist.id, {
        title: result.data.title,
        url: newUrl.trim() || undefined,
        duration: result.data.duration?.trim() || undefined,
        thumbnail: result.data.thumbnail || undefined,
      });
      setNewUrl('');
      setAddOpen(false);
      toast.success('Video added successfully!');
    } else if (result.type === 'playlist') {
      result.data.videos.forEach(v => {
        addVideo(playlist.id, { title: v.title, url: v.url, thumbnail: v.thumbnail, duration: v.duration });
      });
      setNewUrl('');
      setAddOpen(false);
      toast.success(`Added ${result.data.videos.length} videos from playlist`);
    } else {
      toast.error(result.message);
    }
  };

  const handleSaveEdit = () => {
    updatePlaylist(playlist.id, { title: editTitle, description: editDesc || undefined });
    setIsEditing(false);
  };

  const statusIcon = (status: VideoStatus, className = 'h-4 w-4') => {
    if (status === 'completed') return <CheckCircle2 className={`${className} text-success`} />;
    if (status === 'in_progress') return <Clock className={`${className} text-warning`} />;
    return <Circle className={`${className} text-muted-foreground`} />;
  };

  // ─── PLAYER VIEW (split-panel) ────────────────────────────────────────────
  if (viewMode === 'player' && activeVideo) {
    return (
      <div className="animate-fade-in">
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-5">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="font-mono font-bold text-base truncate">{playlist.title}</h2>
            <p className="text-xs text-muted-foreground">{completed}/{total} completed · {percent}%</p>
          </div>
          {!isSingleVideo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 text-xs gap-1.5 shrink-0"
            >
              <LayoutList className="h-3.5 w-3.5" />
              List view
            </Button>
          )}
        </div>

        <div className="flex gap-4 h-[calc(100vh-12rem)]">
          {/* ── Left: Player + Notes ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-3 overflow-y-auto pr-1">
            {/* Player */}
            <VideoPlayer
              key={activeVideo.id}
              url={activeVideo.url!}
              title={activeVideo.title}
              thumbnail={activeVideo.thumbnail}
            />

            {/* Video meta + actions */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base leading-tight">{activeVideo.title}</h3>
                {activeVideo.duration && (
                  <span className="text-xs text-muted-foreground font-mono">{activeVideo.duration}</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant={activeVideo.status === 'completed' ? 'outline' : 'default'}
                  onClick={() => toggleVideoStatus(playlist.id, activeVideo.id)}
                  className="h-8 text-xs gap-1.5"
                >
                  {activeVideo.status === 'completed'
                    ? <><CheckCircle2 className="h-3.5 w-3.5" /> Completed</>
                    : <><Circle className="h-3.5 w-3.5" /> Mark done</>}
                </Button>
                {activeVideo.url && (
                  <a
                    href={activeVideo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open on YouTube"
                    className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Prev / Next navigation */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={goToPrev}
                disabled={activeIndex <= 0}
                className="flex-1 h-9 text-xs gap-1.5"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button
                size="sm"
                variant={activeIndex < sortedVideos.length - 1 ? 'default' : 'outline'}
                onClick={goToNext}
                disabled={activeIndex >= sortedVideos.length - 1}
                className="flex-1 h-9 text-xs gap-1.5"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Per-video notes */}
            <VideoNotes videoId={activeVideo.id} />

            {/* Keyboard hints */}
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground/50 font-mono mt-1">
              <span>← → navigate</span>
              <span>C = mark done</span>
            </div>
          </div>

          {/* ── Right: Video sidebar ── */}
          <div className="w-72 shrink-0 flex flex-col overflow-hidden rounded-xl border border-border bg-card">
            {/* Header */}
            <div className="px-3 py-3 border-b border-border flex items-center gap-2">
              <ListVideo className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                Up Next ({sortedVideos.length})
              </span>
            </div>
            {/* Sort tabs */}
            <div className="px-2 py-1.5 border-b border-border flex gap-1">
              {(['default', 'status', 'completed_date'] as SortMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setSortMode(mode)}
                  className={`flex-1 py-1 rounded text-[9px] uppercase tracking-wider font-mono transition-colors ${
                    sortMode === mode ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {mode === 'default' ? 'Order' : mode === 'status' ? 'Status' : 'Date'}
                </button>
              ))}
            </div>
            {/* Video list */}
            <div className="flex-1 overflow-y-auto">
              {sortedVideos.map((video, i) => {
                const isActive = video.id === activeVideoId;
                return (
                  <button
                    key={video.id}
                    onClick={() => openVideo(video)}
                    className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors border-b border-border/50 last:border-0 ${
                      isActive
                        ? 'bg-primary/10 border-l-2 border-l-primary'
                        : 'hover:bg-secondary/50'
                    }`}
                  >
                    {/* Index or status */}
                    <span className="text-[10px] font-mono text-muted-foreground w-4 shrink-0 pt-0.5">{i + 1}</span>
                    {/* Thumbnail */}
                    {video.thumbnail ? (
                      <div className="relative shrink-0">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="h-8 w-14 object-cover rounded"
                        />
                        {isActive && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
                            <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-8 w-14 bg-secondary rounded shrink-0" />
                    )}
                    {/* Title & meta */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs line-clamp-2 leading-tight font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>
                        {video.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {statusIcon(video.status, 'h-2.5 w-2.5')}
                        {video.duration && (
                          <span className="text-[9px] font-mono text-muted-foreground">{video.duration}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom progress bar */}
            <div className="px-3 py-2.5 border-t border-border">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-muted-foreground">{completed}/{total} done</span>
                <span className="text-[10px] font-mono text-primary">{percent}%</span>
              </div>
              <Progress value={percent} className="h-1.5" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => markPlaylistCompleted(playlist.id)}
                className="w-full mt-2 h-7 text-[10px] gap-1"
              >
                <SkipForward className="h-3 w-3" /> Mark all complete
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      {/* Header */}
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
          <h2
            className="font-mono font-bold text-lg cursor-pointer hover:text-primary transition-colors"
            onClick={() => setIsEditing(true)}
            title="Click to rename"
          >
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

      {/* Progress bar */}
      <div className="flex items-center gap-4 mb-6 p-4 rounded-lg bg-secondary/50">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">{completed}/{total} completed</span>
            <span className="text-sm font-mono text-primary font-semibold">{percent}%</span>
          </div>
          <Progress value={percent} className="h-2" />
        </div>
        <Button size="sm" variant="outline" onClick={() => markPlaylistCompleted(playlist.id)} className="text-xs whitespace-nowrap">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Complete all
        </Button>
      </div>

      {/* Controls */}
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
              <Plus className="h-3 w-3 mr-1" /> Add Video
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-mono">Add Video</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder="Paste YouTube URL"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddVideoAutomatically()}
                className="h-11"
                autoFocus
              />
              <Button
                onClick={handleAddVideoAutomatically}
                disabled={isFetching || !newUrl.trim()}
                className="w-full h-11 text-sm font-medium"
              >
                {isFetching ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Fetching & Adding...</>
                ) : (
                  'Add Video automatically'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Video list */}
      <div className="space-y-1">
        {sortedVideos.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-12">No videos yet. Add one to get started.</p>
        )}
        {sortedVideos.map((video, i) => (
          <div
            key={video.id}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all animate-slide-in border border-transparent ${
              video.url
                ? 'hover:bg-secondary/70 hover:border-border cursor-pointer'
                : 'hover:bg-secondary/40'
            }`}
            style={{ animationDelay: `${i * 30}ms` }}
            onClick={() => video.url ? openVideo(video) : undefined}
          >
            {/* Status toggle */}
            <button
              onClick={e => { e.stopPropagation(); toggleVideoStatus(playlist.id, video.id); }}
              className="shrink-0 transition-transform hover:scale-110"
              aria-label={video.status === 'completed' ? 'Mark as not started' : 'Mark as completed'}
            >
              {statusIcon(video.status)}
            </button>

            {/* Thumbnail */}
            {video.thumbnail ? (
              <div className="shrink-0 relative rounded overflow-hidden">
                <img src={video.thumbnail} alt={video.title} className="h-10 w-[72px] object-cover" />
                {video.url && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                    <div className="w-5 h-5 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[7px] border-l-primary-foreground border-b-[4px] border-b-transparent ml-0.5" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-10 w-[72px] rounded bg-secondary shrink-0 flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground font-mono">{i + 1}</span>
              </div>
            )}

            {/* Title + meta */}
            <div className="flex-1 min-w-0 pr-2">
              <p className={`text-base font-medium truncate transition-colors ${
                video.status === 'completed'
                  ? 'line-through text-muted-foreground'
                  : video.url ? 'group-hover:text-primary text-foreground' : 'text-foreground'
              }`}>
                {video.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {video.duration && <span className="text-[10px] text-muted-foreground font-mono">{video.duration}</span>}
                {video.status === 'in_progress' && <span className="text-[10px] text-warning font-mono">· in progress</span>}
                {video.completedAt && (
                  <span className="text-[10px] text-success/70 font-mono">
                    ✓ {new Date(video.completedAt).toLocaleDateString()}
                  </span>
                )}
                {video.url && !video.completedAt && (
                  <span className="text-[10px] text-primary/50 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                    ▶ click to watch
                  </span>
                )}
              </div>
            </div>

            {/* Delete */}
            <button
              onClick={e => { e.stopPropagation(); deleteVideo(playlist.id, video.id); }}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0 p-1"
              aria-label={`Delete ${video.title}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
