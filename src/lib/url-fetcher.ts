// Client-side URL metadata fetcher using YouTube Data API v3 + oEmbed APIs

const YOUTUBE_API_KEY = 'AIzaSyBPbDjrz7YtBgMPkfJM_nmop5QLWCnSsg0';

function parseIsoDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  const h = parseInt(match[1] || '0');
  const m = parseInt(match[2] || '0');
  const s = parseInt(match[3] || '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}


export interface VideoMetadata {
  title: string;
  url?: string;
  thumbnail?: string;
  description?: string;
  duration?: string;
  author?: string;
  provider?: string;
}

export interface PlaylistMetadata {
  title: string;
  thumbnail?: string;
  description?: string;
  author?: string;
  videos: VideoMetadata[];
}

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractYouTubePlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

async function fetchYouTubeVideo(url: string): Promise<VideoMetadata | null> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!res.ok) return null;
    const data = await res.json();
    const videoId = extractYouTubeVideoId(url);
    return {
      title: data.title || '',
      thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : data.thumbnail_url,
      author: data.author_name,
      provider: 'YouTube',
    };
  } catch {
    return null;
  }
}

async function fetchYouTubePlaylist(playlistId: string): Promise<PlaylistMetadata | null> {
  try {
    // Use YouTube Data API v3 to get all playlist items with pagination
    const videos: VideoMetadata[] = [];
    let pageToken = '';
    let playlistTitle = 'YouTube Playlist';
    let authorName: string | undefined;

    // First, get playlist snippet info
    const snippetRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${YOUTUBE_API_KEY}`
    );
    if (snippetRes.ok) {
      const snippetData = await snippetRes.json();
      const item = snippetData.items?.[0];
      if (item) {
        playlistTitle = item.snippet?.title || playlistTitle;
        authorName = item.snippet?.channelTitle;
      }
    }

    // Fetch all playlist items with pagination
    do {
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) break;
      const data = await res.json();

      // Collect video IDs for duration lookup
      const videoIds: string[] = [];
      for (const item of data.items || []) {
        const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
        if (videoId) videoIds.push(videoId);
      }

      // Fetch durations in batch
      const durationsMap: Record<string, string> = {};
      if (videoIds.length > 0) {
        const vidRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`
        );
        if (vidRes.ok) {
          const vidData = await vidRes.json();
          for (const v of vidData.items || []) {
            durationsMap[v.id] = parseIsoDuration(v.contentDetails?.duration || '');
          }
        }
      }

      for (const item of data.items || []) {
        const snippet = item.snippet;
        const videoId = item.contentDetails?.videoId || snippet?.resourceId?.videoId;
        // Skip deleted/private videos
        if (!videoId || snippet?.title === 'Deleted video' || snippet?.title === 'Private video') continue;
        videos.push({
          title: snippet?.title || '',
          url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined,
          thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : snippet?.thumbnails?.high?.url,
          description: snippet?.description?.slice(0, 200),
          duration: videoId ? durationsMap[videoId] : undefined,
          author: snippet?.videoOwnerChannelTitle,
          provider: 'YouTube',
        });
      }

      pageToken = data.nextPageToken || '';
    } while (pageToken);

    if (videos.length === 0) return fallbackToRss(playlistId);

    return { title: playlistTitle, author: authorName, videos };
  } catch (e) {
    console.error('YouTube API failed, trying RSS fallback:', e);
    return fallbackToRss(playlistId);
  }
}

async function fallbackToRss(playlistId: string): Promise<PlaylistMetadata | null> {
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) return null;
    const text = await res.text();

    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');

    const titleEl = xml.querySelector('feed > title');
    const authorEl = xml.querySelector('feed > author > name');
    const entries = xml.querySelectorAll('entry');

    const videos: VideoMetadata[] = [];
    entries.forEach((entry) => {
      const videoTitle = entry.querySelector('title')?.textContent || '';
      const videoId = entry.querySelector('id')?.textContent?.split(':').pop() || '';
      const mediaGroup = entry.getElementsByTagName('media:group')[0];
      const description = mediaGroup?.getElementsByTagName('media:description')[0]?.textContent || '';
      const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : undefined;

      videos.push({
        title: videoTitle,
        url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined,
        thumbnail,
        description: description.slice(0, 200),
        provider: 'YouTube',
      });
    });

    return {
      title: titleEl?.textContent || 'YouTube Playlist',
      author: authorEl?.textContent,
      videos,
    };
  } catch (e) {
    console.error('Failed to fetch YouTube playlist RSS:', e);
    return null;
  }
}

async function fetchVimeoVideo(url: string): Promise<VideoMetadata | null> {
  try {
    const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title || '',
      thumbnail: data.thumbnail_url,
      description: data.description?.slice(0, 200),
      duration: data.duration ? formatDuration(data.duration) : undefined,
      author: data.author_name,
      provider: 'Vimeo',
    };
  } catch {
    return null;
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export type FetchResult =
  | { type: 'video'; data: VideoMetadata }
  | { type: 'playlist'; data: PlaylistMetadata }
  | { type: 'error'; message: string };

export async function fetchUrlMetadata(url: string): Promise<FetchResult> {
  const trimmed = url.trim();
  if (!trimmed) return { type: 'error', message: 'URL is empty' };

  // YouTube playlist
  const ytPlaylistId = extractYouTubePlaylistId(trimmed);
  if (ytPlaylistId && !extractYouTubeVideoId(trimmed.replace(/[?&]list=[^&]+/, ''))) {
    const data = await fetchYouTubePlaylist(ytPlaylistId);
    if (data) return { type: 'playlist', data };
    return { type: 'error', message: 'Could not fetch playlist info' };
  }

  // YouTube video
  if (extractYouTubeVideoId(trimmed)) {
    const data = await fetchYouTubeVideo(trimmed);
    if (data) return { type: 'video', data };
    return { type: 'error', message: 'Could not fetch video info' };
  }

  // Vimeo
  if (extractVimeoId(trimmed)) {
    const data = await fetchVimeoVideo(trimmed);
    if (data) return { type: 'video', data };
    return { type: 'error', message: 'Could not fetch video info' };
  }

  return { type: 'error', message: 'Only YouTube and Vimeo URLs are supported for auto-fetch' };
}
