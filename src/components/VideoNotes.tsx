import { useState, useEffect } from 'react';
import { StickyNote } from 'lucide-react';

interface VideoNotesProps {
  videoId: string;
}

export function VideoNotes({ videoId }: VideoNotesProps) {
  const storageKey = `video-notes-${videoId}`;
  const [notes, setNotes] = useState(() => localStorage.getItem(storageKey) || '');

  useEffect(() => {
    setNotes(localStorage.getItem(storageKey) || '');
  }, [videoId, storageKey]);

  const handleChange = (val: string) => {
    setNotes(val);
    localStorage.setItem(storageKey, val);
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-1.5 mb-2">
        <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">My Notes</span>
      </div>
      <textarea
        value={notes}
        onChange={e => handleChange(e.target.value)}
        placeholder="Jot down key ideas, timestamps, questions…"
        className="w-full h-28 px-3 py-2 text-sm bg-secondary/50 border border-border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground/50 transition-all font-mono"
      />
    </div>
  );
}
