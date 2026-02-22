import { useState, useEffect, useRef } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlaylist } from '@/context/PlaylistContext';
import { Video } from '@/types/playlist';

interface VideoPlayerProps {
  playlistId: string;
  video: Video;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

// Global declaration for YT api
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function VideoPlayer({ playlistId, video }: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const { updateVideoProgress } = usePlaylist();
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);

  const ytId = extractYouTubeId(video.url || '');
  const vimeoId = !ytId ? extractVimeoId(video.url || '') : null;

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Initialize YouTube API if it's a YouTube video and playing
  useEffect(() => {
    if (!playing || !ytId || !iframeRef.current) return;

    const initPlayer = () => {
      if (!window.YT) return;
      
      playerRef.current = new window.YT.Player(iframeRef.current, {
        events: {
          onReady: (event: any) => {
             if (video.progress && video.progress > 0) {
                 event.target.seekTo(video.progress, true);
             }
          },
          onStateChange: (event: any) => {
             // YT.PlayerState.PLAYING === 1
             if (event.data === 1) {
                progressIntervalRef.current = setInterval(() => {
                   if (playerRef.current && playerRef.current.getCurrentTime) {
                      const time = playerRef.current.getCurrentTime();
                      if (time > 0) {
                         updateVideoProgress(playlistId, video.id, Math.floor(time));
                      }
                   }
                }, 2000);
             } else {
                if (progressIntervalRef.current) {
                   clearInterval(progressIntervalRef.current);
                }
             }
          }
        }
      });
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = initPlayer;
    } else {
      initPlayer();
    }
  }, [playing, ytId, video.id, playlistId, video.progress, updateVideoProgress]);

  if (!ytId && !vimeoId) {
    // Generic link fallback
    return (
      <div className="relative w-full aspect-video bg-secondary rounded-xl overflow-hidden flex flex-col items-center justify-center gap-4">
        {video.thumbnail && (
          <img src={video.thumbnail} alt={video.title} className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <div className="relative z-10 text-center px-6">
          <p className="text-sm text-muted-foreground mb-3">This video can't be played in-app.</p>
          <a href={video.url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open externally
            </Button>
          </a>
        </div>
      </div>
    );
  }

  const embedUrl = ytId
    ? `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`
    : `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;

  if (!playing) {
    return (
      <div
        className="relative w-full aspect-video bg-black rounded-xl overflow-hidden cursor-pointer group"
        onClick={() => setPlaying(true)}
      >
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center">
            <Play className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
        
        {/* Progress bar on thumbnail if previously watched */}
        {video.progress && video.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-secondary/50">
             <div className="h-full bg-primary" style={{ width: '100%', transform: `scaleX(${video.progress > 600 ? 0.9 : 0.3})`, transformOrigin: 'left' }} />
          </div>
        )}

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-200">
            <Play className="h-7 w-7 text-primary-foreground fill-primary-foreground ml-1" />
          </div>
        </div>
        {/* Title overlay */}
        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-sm font-medium line-clamp-2">{video.title}</p>
          <p className="text-white/60 text-xs mt-1">
            {video.progress && video.progress > 5 ? `Resume from ${Math.floor(video.progress / 60)}:${String(video.progress % 60).padStart(2, '0')}` : 'Click to play'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl bg-black">
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={video.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute inset-0 w-full h-full border-0"
      />
    </div>
  );
}
