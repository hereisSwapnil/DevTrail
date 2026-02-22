# Dev Track

A developer-focused learning platform for tracking progress through video tutorials, courses, and playlists — with a built-in video player so you never have to leave the app.

## Features

- **In-app video player** — click any video to open an embedded YouTube/Vimeo player directly inside the app. No new tabs.
- **Split-panel learning view** — playlists open in a two-panel layout: embedded player on the left, scrollable video list on the right. Navigate videos without losing your place.
- **Per-video notes** — jot down key ideas, timestamps, or questions for each video. Notes are saved automatically in your browser.
- **Playlist tracking** — import a YouTube playlist URL to auto-populate all videos with titles, thumbnails, and durations.
- **Single video tracking** — add individual YouTube or Vimeo videos. They open in the same full player view as playlists.
- **Auto status tracking** — videos are automatically marked *In Progress* when opened and *Completed* when you click Mark Done.
- **Sort & filter** — sort videos by status or completion date inside a playlist. Search across all playlists and videos from the dashboard.
- **Keyboard shortcuts** — `←`/`→` to navigate between videos, `C` to mark the current video complete.
- **Export / Import** — back up and restore all data as a JSON file.

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [shadcn/ui](https://ui.shadcn.com/) component library
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Lucide React](https://lucide.dev/) icons
- [Sonner](https://sonner.emilkowal.ski/) toasts
- Data persisted in `localStorage` — no backend required

## Getting started

```sh
# 1. Clone the repository
git clone https://github.com/<your-username>/dev-track.git

# 2. Navigate to the project directory
cd dev-track

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Available scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest unit tests |

## Usage

### Watching a playlist
1. Click **New → Playlist** and paste a YouTube playlist URL, or enter a title manually.
2. Click the playlist card — videos load in the **split-panel view**.
3. Click any video in the sidebar to start watching. The player is embedded directly in the page.
4. Use **Prev / Next** buttons or `←`/`→` keys to move between videos.
5. Click **Mark Done** (or press `C`) to mark the current video complete.

### Watching a single video
1. Click **New → Single Video** and paste a YouTube or Vimeo URL.
2. Click the video card — the full-screen embedded player opens immediately.
3. Take notes in the **My Notes** panel below the player.

### Exporting and importing
- **Export** downloads a JSON snapshot of all your data.
- **Import** restores from a previously exported JSON file.
