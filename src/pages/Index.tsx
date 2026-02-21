import { useState, useMemo, useRef } from 'react';
import { usePlaylist } from '@/context/PlaylistContext';
import { PlaylistCard } from '@/components/PlaylistCard';
import { PlaylistDetail } from '@/components/PlaylistDetail';
import { Search, Plus, Download, Upload, LayoutGrid, Link, Loader2 } from 'lucide-react';
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

export default function Dashboard() {
  const { playlists, addPlaylist, addVideo, exportData, importData, getPlaylistStats } = usePlaylist();
  const [search, setSearch] = useState('');
  const [openPlaylistId, setOpenPlaylistId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [isFetchingPlaylist, setIsFetchingPlaylist] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return playlists;
    const q = search.toLowerCase();
    return playlists.filter(p => p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
  }, [playlists, search]);

  const totalVideos = playlists.reduce((sum, p) => sum + p.videos.length, 0);
  const totalCompleted = playlists.reduce((sum, p) => sum + getPlaylistStats(p).completed, 0);
  const overallPercent = totalVideos === 0 ? 0 : Math.round((totalCompleted / totalVideos) * 100);

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
      setNewPlaylistUrl('');
      setNewTitle('');
      setNewDesc('');
      setAddOpen(false);
      toast.success(`Created playlist with ${result.data.videos.length} videos`);
    } else if (result.type === 'video') {
      setNewTitle(result.data.title);
      toast.info('This is a single video URL. Title auto-filled.');
    } else {
      toast.error(result.message);
    }
  };

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addPlaylist(newTitle.trim(), newDesc.trim() || undefined);
    setNewTitle('');
    setNewDesc('');
    setNewPlaylistUrl('');
    setAddOpen(false);
    toast.success('Playlist created');
  };

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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              Dev Playlist
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Track your learning progress</p>
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
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Playlists', value: playlists.length },
            { label: 'Videos', value: `${totalCompleted}/${totalVideos}` },
            { label: 'Progress', value: `${overallPercent}%` },
          ].map(stat => (
            <div key={stat.label} className="rounded-lg border border-border bg-card p-4 text-center">
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
              placeholder="Search playlists..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-mono">New Playlist</DialogTitle>
              </DialogHeader>
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
                <Button onClick={handleAdd} disabled={!newTitle.trim()} className="w-full">Create Playlist</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <LayoutGrid className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">
              {search ? 'No playlists match your search.' : 'No playlists yet. Create one to get started.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(p => (
              <PlaylistCard key={p.id} playlist={p} onOpen={setOpenPlaylistId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
