# Dev Track

A developer-focused learning tracker that helps you organise and track your progress through video tutorials, courses, and playlists.

## Features

- **Playlist tracking** — import a YouTube playlist URL to auto-populate all videos with titles, thumbnails, and durations. Track progress per playlist.
- **Single video tracking** — add individual YouTube or Vimeo videos directly to your dashboard. Mark them as complete without leaving the main view.
- **Thumbnail previews** — playlist and video cards show cover thumbnails fetched automatically from YouTube/Vimeo.
- **Dashboard controls** — single videos expose mark-complete, open-in-new-tab, and delete actions directly on the card. Playlists open a detail view with sorting, bulk-complete, and per-video controls.
- **Status tracking** — videos cycle through *not started*, *in progress*, and *completed* states.
- **Sort & filter** — sort videos by status or completion date inside a playlist. Search across all playlists and videos from the dashboard.
- **Export / Import** — back up and restore all data as a JSON file.
- **Smooth animations** — cards animate in with staggered scale-in transitions for a polished feel.

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

### Adding a playlist
1. Click **New → Playlist**.
2. Paste a YouTube playlist URL and click the fetch button to import all videos automatically, *or* enter a title manually.
3. Click **Create Playlist** — the card appears on the dashboard with a progress bar.
4. Click the card to open the detail view, where you can mark individual videos, sort, and add more.

### Adding a single video
1. Click **New → Single Video**.
2. Paste a YouTube or Vimeo URL and click the fetch button to fill in the title, thumbnail, and duration.
3. Click **Add Video** — the card appears in the *Single Videos* section of the dashboard.
4. Use the **Mark Complete** button directly on the card. Click the link icon to open the video in a new tab.

### Exporting and importing
- **Export** downloads a JSON snapshot of all your data.
- **Import** restores from a previously exported JSON file.
