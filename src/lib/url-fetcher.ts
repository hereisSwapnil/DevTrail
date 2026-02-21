// Client-side URL metadata fetcher using oEmbed APIs (no backend needed)

export interface VideoMetadata {
  title: string;
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
    // Fetch the actual playlist page to get all videos (RSS is limited to 15)
    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(playlistUrl)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) return fallbackToRss(playlistId);
    const html = await res.text();

    // Extract ytInitialData JSON from the page
    const dataMatch = html.match(/var\s+ytInitialData\s*=\s*(\{.+?\});\s*<\/script>/s);
    if (!dataMatch) return fallbackToRss(playlistId);

    const data = JSON.parse(dataMatch[1]);
    
    // Navigate the data structure to find playlist info
    const sidebar = data?.sidebar?.playlistSidebarRenderer?.items;
    const primaryInfo = sidebar?.[0]?.playlistSidebarPrimaryInfoRenderer;
    const playlistTitle = primaryInfo?.title?.runs?.[0]?.text || 'YouTube Playlist';
    
    const secondaryInfo = sidebar?.[1]?.playlistSidebarSecondaryInfoRenderer;
    const authorName = secondaryInfo?.videoOwner?.videoOwnerRenderer?.title?.runs?.[0]?.text;

    // Extract videos from playlist contents
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs;
    const tabContent = tabs?.[0]?.tabRenderer?.content;
    const sectionList = tabContent?.sectionListRenderer?.contents;
    const itemSection = sectionList?.[0]?.itemSectionRenderer?.contents;
    const playlistItems = itemSection?.[0]?.playlistVideoListRenderer?.contents || [];

    const videos: VideoMetadata[] = [];
    for (const item of playlistItems) {
      const renderer = item?.playlistVideoRenderer;
      if (!renderer) continue;
      const videoId = renderer.videoId;
      const title = renderer.title?.runs?.[0]?.text || renderer.title?.simpleText || '';
      const duration = renderer.lengthText?.simpleText;
      const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : undefined;
      
      videos.push({
        title,
        thumbnail,
        duration,
        provider: 'YouTube',
      });
    }

    if (videos.length === 0) return fallbackToRss(playlistId);

    return {
      title: playlistTitle,
      author: authorName,
      videos,
    };
  } catch (e) {
    console.error('Failed to fetch YouTube playlist page, trying RSS fallback:', e);
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
