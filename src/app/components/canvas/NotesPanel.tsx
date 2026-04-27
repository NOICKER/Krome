import React, { useEffect, useState } from 'react';
import { useCanvasStorage } from '../../hooks/useCanvasStorage';

export default function NotesPanel({
  isOpen,
  pattern,
  fallbackPattern,
}: any) {
  const { loadNotes, saveNotes } = useCanvasStorage();
  const [text, setText] = useState('');

  useEffect(() => {
    loadNotes().then((data) => {
      setText(data?.text || '');
    });
  }, [loadNotes]);

  const handleChange = (newText: string) => {
    setText(newText);
    saveNotes({ text: newText, lastUpdated: new Date().toISOString() });
  };

  return (
    <aside className={`notes-panel${isOpen ? ' open' : ''}`}>
      <div className="notes-panel-header">
        <span>QUICK NOTES</span>
      </div>
      <textarea
        className="notes-panel-textarea"
        value={text}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="write anything... observations, patterns, confusions..."
      />
      <div className="notes-panel-footer">
        <span className="notes-panel-label">EMERGING PATTERNS</span>
        <p className="notes-panel-pattern">
          {pattern || fallbackPattern || 'Write a little longer and Neutrawn will connect your notes to your mistakes.'}
        </p>
      </div>
    </aside>
  );
}
