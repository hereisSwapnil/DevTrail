export type VideoStatus = 'not_started' | 'in_progress' | 'completed';

export interface Video {
  id: string;
  title: string;
  url?: string;
  duration?: string;
  status: VideoStatus;
  completedAt?: string;
  createdAt: string;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  videos: Video[];
  createdAt: string;
  updatedAt: string;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
