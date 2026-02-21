import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Playlist, Video, VideoStatus, generateId } from '@/types/playlist';

const STORAGE_KEY = 'dev-playlist-data';

interface PlaylistContextType {
  playlists: Playlist[];
  addPlaylist: (title: string, description?: string) => Playlist;
  updatePlaylist: (id: string, updates: Partial<Pick<Playlist, 'title' | 'description'>>) => void;
  deletePlaylist: (id: string) => void;
  addVideo: (playlistId: string, video: Omit<Video, 'id' | 'status' | 'createdAt'>) => void;
  updateVideo: (playlistId: string, videoId: string, updates: Partial<Video>) => void;
  deleteVideo: (playlistId: string, videoId: string) => void;
  toggleVideoStatus: (playlistId: string, videoId: string) => void;
  markPlaylistCompleted: (playlistId: string) => void;
  exportData: () => string;
  importData: (json: string) => boolean;
  getPlaylistStats: (playlist: Playlist) => { total: number; completed: number; percent: number };
}

const PlaylistContext = createContext<PlaylistContextType | null>(null);

function loadPlaylists(): Playlist[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  const [playlists, setPlaylists] = useState<Playlist[]>(loadPlaylists);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  }, [playlists]);

  const addPlaylist = useCallback((title: string, description?: string) => {
    const now = new Date().toISOString();
    const playlist: Playlist = { id: generateId(), title, description, videos: [], createdAt: now, updatedAt: now };
    setPlaylists(prev => [playlist, ...prev]);
    return playlist;
  }, []);

  const updatePlaylist = useCallback((id: string, updates: Partial<Pick<Playlist, 'title' | 'description'>>) => {
    setPlaylists(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
  }, []);

  const addVideo = useCallback((playlistId: string, video: Omit<Video, 'id' | 'status' | 'createdAt'>) => {
    const newVideo: Video = { ...video, id: generateId(), status: 'not_started', createdAt: new Date().toISOString() };
    setPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, videos: [...p.videos, newVideo], updatedAt: new Date().toISOString() } : p));
  }, []);

  const updateVideo = useCallback((playlistId: string, videoId: string, updates: Partial<Video>) => {
    setPlaylists(prev => prev.map(p => p.id === playlistId ? {
      ...p,
      videos: p.videos.map(v => v.id === videoId ? { ...v, ...updates } : v),
      updatedAt: new Date().toISOString(),
    } : p));
  }, []);

  const deleteVideo = useCallback((playlistId: string, videoId: string) => {
    setPlaylists(prev => prev.map(p => p.id === playlistId ? {
      ...p,
      videos: p.videos.filter(v => v.id !== videoId),
      updatedAt: new Date().toISOString(),
    } : p));
  }, []);

  const toggleVideoStatus = useCallback((playlistId: string, videoId: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id !== playlistId) return p;
      return {
        ...p,
        videos: p.videos.map(v => {
          if (v.id !== videoId) return v;
          const nextStatus: VideoStatus = v.status === 'completed' ? 'not_started' : 'completed';
          return { ...v, status: nextStatus, completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined };
        }),
        updatedAt: new Date().toISOString(),
      };
    }));
  }, []);

  const markPlaylistCompleted = useCallback((playlistId: string) => {
    const now = new Date().toISOString();
    setPlaylists(prev => prev.map(p => p.id === playlistId ? {
      ...p,
      videos: p.videos.map(v => ({ ...v, status: 'completed' as VideoStatus, completedAt: v.completedAt || now })),
      updatedAt: now,
    } : p));
  }, []);

  const exportData = useCallback(() => JSON.stringify(playlists, null, 2), [playlists]);

  const importData = useCallback((json: string) => {
    try {
      const data = JSON.parse(json);
      if (Array.isArray(data)) {
        setPlaylists(data);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const getPlaylistStats = useCallback((playlist: Playlist) => {
    const total = playlist.videos.length;
    const completed = playlist.videos.filter(v => v.status === 'completed').length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, percent };
  }, []);

  return (
    <PlaylistContext.Provider value={{
      playlists, addPlaylist, updatePlaylist, deletePlaylist,
      addVideo, updateVideo, deleteVideo, toggleVideoStatus,
      markPlaylistCompleted, exportData, importData, getPlaylistStats,
    }}>
      {children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylist() {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error('usePlaylist must be used within PlaylistProvider');
  return ctx;
}
