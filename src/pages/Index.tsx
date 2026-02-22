import { useState, useMemo, useRef, useEffect } from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { PlaylistCard } from '@/components/PlaylistCard';
import { VideoCard } from '@/components/VideoCard';
import { PlaylistDetail } from '@/components/PlaylistDetail';
import { Search, Plus, Download, Upload, Loader2, ListVideo, Video, Compass, ExternalLink, Keyboard, Layers, Film } from 'lucide-react';
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

// removed AddMode type

export default function Dashboard() {
  const { playlists, addPlaylist, addVideo, exportData, importData, getPlaylistStats } = usePlaylist();
  const [search, setSearch] = useState('');
  const [openPlaylistId, setOpenPlaylistId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Unified add form state
  const [newUrl, setNewUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return playlists;
    const q = search.toLowerCase();
    return playlists.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.videos.some(v => v.title.toLowerCase().includes(q))
    );
  }, [playlists, search]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    // Only apply if not viewing a specific playlist
    if (openPlaylistId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus Search: Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // Open Add New Modal: Cmd/Ctrl + I (Insert, avoids overriding browser's New Window)
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        setAddOpen(true);
      }
      
      // Close Add Modal: Escape (handled natively by Dialog too, but helps ensure state cleans)
      if (e.key === 'Escape' && addOpen) {
        setAddOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openPlaylistId, addOpen]);

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

  // ---- Unified dialog handlers ----
  const handleProcessUrl = async () => {
    if (!newUrl.trim()) return;
    setIsFetchingUrl(true);
    const result = await fetchUrlMetadata(newUrl.trim());
    setIsFetchingUrl(false);

    if (result.type === 'playlist') {
      const pl = addPlaylist(result.data.title, result.data.author ? `By ${result.data.author}` : undefined);
      result.data.videos.forEach(v => {
        addVideo(pl.id, { title: v.title, url: v.url, thumbnail: v.thumbnail, duration: v.duration });
      });
      setNewUrl('');
      setAddOpen(false);
      toast.success(`Created playlist with ${result.data.videos.length} videos`);
    } else if (result.type === 'video') {
      const pl = addPlaylist(result.data.title, undefined, true);
      addVideo(pl.id, {
        title: result.data.title,
        url: newUrl.trim() || undefined,
        thumbnail: result.data.thumbnail || undefined,
        duration: result.data.duration?.trim() || undefined,
      });
      setNewUrl('');
      setAddOpen(false);
      toast.success('Video added');
    } else {
      toast.error(result.message);
    }
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
      setNewUrl('');
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
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <img src="/favicon.svg" alt="DevTrail logo" className="h-10 w-10 drop-shadow-md rounded-xl" />
              <span className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">DevTrail</span>
            </h1>
            <p className="text-sm text-muted-foreground/80 mt-1 font-medium ml-[52px]">Track your learning journey</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShortcutsOpen(true)} className="text-xs" title="Keyboard Shortcuts">
              <Keyboard className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Shortcuts</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="text-xs hidden sm:flex">
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="text-xs hidden sm:flex">
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
              className="relative overflow-hidden rounded-xl border border-border/50 bg-card/50 p-5 text-center backdrop-blur-sm animate-fade-in hover:border-primary/20 hover:bg-card hover:shadow-lg transition-all"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary/10 to-transparent blur-xl rounded-full -mr-8 -mt-8" />
              <div className="text-2xl font-mono font-bold text-foreground mb-1">{stat.value}</div>
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Search + Add */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search playlists and videos... (Cmd+K)"
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

              <div className="space-y-4 pt-2">
                <Input 
                  placeholder="Paste YouTube URL (Video or Playlist)" 
                  value={newUrl} 
                  onChange={e => setNewUrl(e.target.value)} 
                  className="h-11"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleProcessUrl()}
                />
                <Button 
                  onClick={handleProcessUrl} 
                  disabled={isFetchingUrl || !newUrl.trim()} 
                  className="w-full h-11 text-sm font-medium"
                >
                  {isFetchingUrl ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Fetching & Adding...</>
                  ) : (
                    'Add automatically'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-mono text-lg flex items-center gap-2">
                  <Keyboard className="h-5 w-5" /> Keyboard Shortcuts
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2 pb-4">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm font-medium">Search Library</span>
                    <kbd className="pointer-events-none inline-flex h-6 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground opacity-100"><span className="text-xs">⌘</span>K</kbd>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm font-medium">Add New Item</span>
                    <kbd className="pointer-events-none inline-flex h-6 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground opacity-100"><span className="text-xs">⌘</span>I</kbd>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm font-medium">Navigate Playlist</span>
                    <div className="flex gap-1">
                      <kbd className="pointer-events-none inline-flex h-6 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground opacity-100">←</kbd>
                      <kbd className="pointer-events-none inline-flex h-6 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground opacity-100">→</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm font-medium">Toggle Video Complete</span>
                    <kbd className="pointer-events-none inline-flex h-6 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground opacity-100">C</kbd>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm font-medium">Close / Go Back</span>
                    <kbd className="pointer-events-none inline-flex h-6 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground opacity-100">Esc</kbd>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Empty state */}
        {isEmpty && (
          <div className="text-center py-24 animate-fade-in flex flex-col items-center justify-center">
            <img src="/favicon.svg" alt="DevTrail logo" className="h-16 w-16 mb-4 opacity-50 drop-shadow-sm rounded-2xl" />
            <h3 className="text-lg font-medium text-foreground mb-1">Your library is empty</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              {search ? 'No results match your search query. Try another term.' : 'Add a YouTube playlist or video URL to start tracking your learning progress.'}
            </p>
            {/* Create inline button if not searching */}
            {!search && (
              <Button onClick={() => setAddOpen(true)} className="mt-6 font-medium rounded-full px-6">
                <Plus className="h-4 w-4 mr-2" /> Add First Item
              </Button>
            )}
          </div>
        )}

        {/* Playlists section */}
        {playlistEntries.length > 0 && (
          <section className="mb-10">
            {singleVideoEntries.length > 0 && (
              <div className="flex items-center gap-2.5 mb-5 pl-1 border-l-2 border-primary">
                <Layers className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-[0.15em]">Playlists</h2>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <div className="flex items-center gap-2.5 mb-5 pl-1 border-l-2 border-primary">
                <Film className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-[0.15em]">Single Videos</h2>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
