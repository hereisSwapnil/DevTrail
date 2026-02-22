import { useState, useMemo, useRef } from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { PlaylistCard } from '@/components/PlaylistCard';
import { VideoCard } from '@/components/VideoCard';
import { PlaylistDetail } from '@/components/PlaylistDetail';
import { Search, Plus, Download, Upload, Link, Loader2, ListVideo, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { fetchUrlMetadata } from '@/lib/url-fetcher';

type AddMode = 'playlist' | 'video';

export default function Dashboard() {
  const { playlists, addPlaylist, addVideo, exportData, importData, getPlaylistStats } = usePlaylist();
  const [search, setSearch] = useState('');
  const [openPlaylistId, setOpenPlaylistId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('playlist');
  const fileRef = useRef<HTMLInputElement>(null);

  // Playlist form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [isFetchingPlaylist, setIsFetchingPlaylist] = useState(false);

  // Single video form state
  const [vidUrl, setVidUrl] = useState('');
  const [vidTitle, setVidTitle] = useState('');
  const [vidDuration, setVidDuration] = useState('');
  const [vidThumbnail, setVidThumbnail] = useState('');
  const [isFetchingVid, setIsFetchingVid] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return playlists;
    const q = search.toLowerCase();
    return playlists.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.videos.some(v => v.title.toLowerCase().includes(q))
    );
  }, [playlists, search]);

  const playlistEntries = filtered.filter(p => !p.isSingleVideo);
  const singleVideoEntries = filtered.filter(p => p.isSingleVideo);

  const { totalPlaylists, totalSingleVideos, totalCompleted, totalVideos } = playlists.reduce(
    (acc, p) => {
      const stats = getPlaylistStats(p);
      return {
        totalPlaylists: acc.totalPlaylists + (p.isSingleVideo ? 0 : 1),
        totalSingleVideos: acc.totalSingleVideos + (p.isSingleVideo ? 1 : 0),
        totalCompleted: acc.totalCompleted + stats.completed,
        totalVideos: acc.totalVideos + p.videos.length,
      };
    },
    { totalPlaylists: 0, totalSingleVideos: 0, totalCompleted: 0, totalVideos: 0 },
  );
  const overallPercent = totalVideos === 0 ? 0 : Math.round((totalCompleted / totalVideos) * 100);

  // ---- Playlist dialog handlers ----
  const handleFetchPlaylistUrl = async () => {
    if (!newPlaylistUrl.trim()) return;
    setIsFetchingPlaylist(true);
    const result = await fetchUrlMetadata(newPlaylistUrl.trim());
    setIsFetchingPlaylist(false);

    if (result.type === 'playlist') {
      const pl = addPlaylist(result.data.title, result.data.author ? `By ${result.data.author}` : undefined);
      result.data.videos.forEach(v => {
        addVideo(pl.id, { title: v.title, url: v.url, thumbnail: v.thumbnail, duration: v.duration });
      });
      resetPlaylistForm();
      setAddOpen(false);
      toast.success(`Created playlist with ${result.data.videos.length} videos`);
    } else if (result.type === 'video') {
      setNewTitle(result.data.title);
      toast.info('This is a single video URL. Title auto-filled.');
    } else {
      toast.error(result.message);
    }
  };

  const handleAddPlaylist = () => {
    if (!newTitle.trim()) return;
    addPlaylist(newTitle.trim(), newDesc.trim() || undefined);
    resetPlaylistForm();
    setAddOpen(false);
    toast.success('Playlist created');
  };

  const resetPlaylistForm = () => {
    setNewTitle('');
    setNewDesc('');
    setNewPlaylistUrl('');
  };

  // ---- Single video dialog handlers ----
  const handleFetchVideoUrl = async () => {
    if (!vidUrl.trim()) return;
    setIsFetchingVid(true);
    const result = await fetchUrlMetadata(vidUrl.trim());
    setIsFetchingVid(false);

    if (result.type === 'video') {
      setVidTitle(result.data.title);
      setVidThumbnail(result.data.thumbnail || '');
      if (result.data.duration) setVidDuration(result.data.duration);
      toast.success('Video info fetched!');
    } else if (result.type === 'playlist') {
      toast.info('This is a playlist URL. Use the Playlist tab instead.');
    } else {
      toast.error(result.message);
    }
  };

  const handleAddSingleVideo = () => {
    if (!vidTitle.trim()) return;
    const pl = addPlaylist(vidTitle.trim(), undefined, true);
    addVideo(pl.id, {
      title: vidTitle.trim(),
      url: vidUrl.trim() || undefined,
      thumbnail: vidThumbnail || undefined,
      duration: vidDuration.trim() || undefined,
    });
    resetVideoForm();
    setAddOpen(false);
    toast.success('Video added');
  };

  const resetVideoForm = () => {
    setVidUrl('');
    setVidTitle('');
    setVidDuration('');
    setVidThumbnail('');
  };

  // ---- Export / Import ----
  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dev-playlist-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importData(reader.result as string);
      toast[ok ? 'success' : 'error'](ok ? 'Data imported' : 'Invalid file format');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDialogOpenChange = (open: boolean) => {
    setAddOpen(open);
    if (!open) {
      resetPlaylistForm();
      resetVideoForm();
    }
  };

  const openPlaylist = openPlaylistId ? playlists.find(p => p.id === openPlaylistId) : null;

  if (openPlaylist) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <PlaylistDetail playlist={openPlaylist} onBack={() => setOpenPlaylistId(null)} />
        </div>
      </div>
    );
  }

  const isEmpty = filtered.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
              <img src="/logo.png" alt="DevTrail logo" className="h-8 w-8 rounded-lg" />
              DevTrail
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Track your learning journey</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="text-xs">
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="text-xs">
              <Upload className="h-3 w-3 mr-1" />
              Import
            </Button>
            <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Playlists', value: totalPlaylists },
            { label: 'Videos', value: totalSingleVideos },
            { label: 'Watched', value: `${totalCompleted}/${totalVideos}` },
            { label: 'Progress', value: `${overallPercent}%` },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-card p-4 text-center animate-fade-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="text-lg font-mono font-bold text-primary">{stat.value}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Search + Add */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search playlists and videos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Dialog open={addOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-mono">Add New</DialogTitle>
              </DialogHeader>

              {/* Mode toggle */}
              <div className="flex rounded-md border border-border overflow-hidden mb-1">
                <button
                  onClick={() => setAddMode('playlist')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium transition-colors ${addMode === 'playlist' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                >
                  <ListVideo className="h-3.5 w-3.5" />
                  Playlist
                </button>
                <button
                  onClick={() => setAddMode('video')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium transition-colors ${addMode === 'video' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                >
                  <Video className="h-3.5 w-3.5" />
                  Single Video
                </button>
              </div>

              {/* Playlist form */}
              {addMode === 'playlist' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input placeholder="Paste YouTube playlist URL" value={newPlaylistUrl} onChange={e => setNewPlaylistUrl(e.target.value)} className="flex-1" />
                    <Button variant="outline" size="sm" onClick={handleFetchPlaylistUrl} disabled={isFetchingPlaylist || !newPlaylistUrl.trim()} className="shrink-0">
                      {isFetchingPlaylist ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="relative flex items-center">
                    <div className="flex-1 border-t border-border" />
                    <span className="px-2 text-[10px] text-muted-foreground uppercase">or manually</span>
                    <div className="flex-1 border-t border-border" />
                  </div>
                  <Input placeholder="Playlist title *" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                  <Input placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                  <Button onClick={handleAddPlaylist} disabled={!newTitle.trim()} className="w-full">Create Playlist</Button>
                </div>
              )}

              {/* Single video form */}
              {addMode === 'video' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input placeholder="Paste YouTube/Vimeo URL" value={vidUrl} onChange={e => setVidUrl(e.target.value)} className="flex-1" />
                    <Button variant="outline" size="sm" onClick={handleFetchVideoUrl} disabled={isFetchingVid || !vidUrl.trim()} className="shrink-0">
                      {isFetchingVid ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
                    </Button>
                  </div>
                  {vidThumbnail && (
                    <img src={vidThumbnail} alt="Thumbnail preview" className="w-full h-32 object-cover rounded-md" />
                  )}
                  <Input placeholder="Video title *" value={vidTitle} onChange={e => setVidTitle(e.target.value)} />
                  <Input placeholder="Duration, e.g. 12:30 (optional)" value={vidDuration} onChange={e => setVidDuration(e.target.value)} />
                  <Button onClick={handleAddSingleVideo} disabled={!vidTitle.trim()} className="w-full">Add Video</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Empty state */}
        {isEmpty && (
          <div className="text-center py-20 animate-fade-in">
            <img src="/logo.png" alt="" className="h-12 w-12 rounded-xl mx-auto mb-4 opacity-30" />
            <p className="text-muted-foreground text-sm">
              {search ? 'No results match your search.' : 'Nothing here yet. Add a playlist or video to get started.'}
            </p>
          </div>
        )}

        {/* Playlists section */}
        {playlistEntries.length > 0 && (
          <section className="mb-8">
            {singleVideoEntries.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <ListVideo className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">Playlists</h2>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {playlistEntries.map((p, i) => (
                <PlaylistCard key={p.id} playlist={p} onOpen={setOpenPlaylistId} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Single videos section */}
        {singleVideoEntries.length > 0 && (
          <section>
            {playlistEntries.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <Video className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">Single Videos</h2>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {singleVideoEntries.map((p, i) => (
                <VideoCard key={p.id} playlist={p} index={i} onOpen={setOpenPlaylistId} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
