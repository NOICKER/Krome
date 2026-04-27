import React, { useEffect, useRef, useState } from 'react';

const ICONS: Record<string, React.ReactNode> = {
  'lock': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
  'hand': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"></path><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"></path><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path></svg>,
  'select': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path><path d="m13 13 6 6"></path></svg>,
  'shape-rect': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>,
  'shape-diamond': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"></path></svg>,
  'shape-ellipse': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>,
  'shape-arrow': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>,
  'shape-line': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="19" x2="19" y2="5"></line></svg>,
  'shape-freedraw': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>,
  'shape-text': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>,
  'image': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>,
  'pen': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path></svg>,
  'highlighter': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 11 6 6"></path><path d="m4.5 9.5 4-4a2 2 0 0 1 2.8 0l7 7a2 2 0 0 1 0 2.8l-4 4a2 2 0 0 1-2.8 0l-7-7a2 2 0 0 1 0-2.8Z"></path><path d="m18 5-3 3"></path></svg>,
  'marker': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>,
  'eraser': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"></path><path d="M22 21H7"></path><path d="m5 11 9 9"></path></svg>
};

const TOOLS = [
  { id: 'lock',          icon: ICONS['lock'],          label: 'Lock',      shortcut: null },
  { id: 'hand',          icon: ICONS['hand'],          label: 'Hand',      shortcut: 'H' },
  { id: 'select',        icon: ICONS['select'],        label: 'Select',    shortcut: 'V' },
  { id: 'shape-rect',    icon: ICONS['shape-rect'],    label: 'Rectangle', shortcut: 'R' },
  { id: 'shape-diamond', icon: ICONS['shape-diamond'], label: 'Diamond',   shortcut: 'D' },
  { id: 'shape-ellipse', icon: ICONS['shape-ellipse'], label: 'Ellipse',   shortcut: 'E' },
  { id: 'shape-arrow',   icon: ICONS['shape-arrow'],   label: 'Arrow',     shortcut: 'A' },
  { id: 'shape-line',    icon: ICONS['shape-line'],    label: 'Line',      shortcut: 'L' },
  { id: 'shape-freedraw',icon: ICONS['shape-freedraw'],label: 'FreeDraw',  shortcut: 'P' },
  { id: 'shape-text',    icon: ICONS['shape-text'],    label: 'Text',      shortcut: 'T' },
  { id: 'image',         icon: ICONS['image'],         label: 'Image',     shortcut: null },
  { id: 'pen',           icon: ICONS['pen'],           label: 'Pen',       shortcut: 'N', isSeparatorBefore: true },
  { id: 'marker',        icon: ICONS['marker'],        label: 'Marker',    shortcut: 'M' },
  { id: 'highlighter',   icon: ICONS['highlighter'],   label: 'Highlighter', shortcut: 'I' },
  { id: 'eraser',        icon: ICONS['eraser'],        label: 'Eraser',    shortcut: 'X' },
];

export default function CanvasToolbar({ activeTool, setActiveTool }: any) {
  const [pos, setPos] = useState<{ x: number | null, y: number }>({ x: null, y: 20 });
  const draggingRef = useRef(false);
  const dragStartRef = useRef<any>({});
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pos.x === null && barRef.current) {
      const width = barRef.current.offsetWidth || 540;
      setPos({ x: (window.innerWidth - 52 - width) / 2, y: 20 });
    }
  }, [pos.x]);

  const onGripDown = (event: React.MouseEvent) => {
    draggingRef.current = true;
    dragStartRef.current = { mx: event.clientX, my: event.clientY, ox: pos.x, oy: pos.y };
    event.preventDefault();
  };

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!draggingRef.current) return;
      setPos({
        x: dragStartRef.current.ox + (event.clientX - dragStartRef.current.mx),
        y: dragStartRef.current.oy + (event.clientY - dragStartRef.current.my),
      });
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const separator = (
    <div style={{ width: 1, height: 24, background: 'var(--nt-border)', margin: '0 3px', flexShrink: 0 }} />
  );

  return (
    <div
      ref={barRef}
      style={{
        position: 'absolute',
        left: pos.x ?? 100,
        top: pos.y,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        backgroundColor: 'var(--nt-bg3)',
        border: '1px solid var(--nt-border)',
        borderRadius: 40,
        padding: '5px 10px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        zIndex: 1000,
        userSelect: 'none',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        onMouseDown={onGripDown}
        style={{ cursor: 'grab', color: 'var(--nt-text3)', padding: '0 6px', fontSize: 13, flexShrink: 0 }}
        title="Drag toolbar"
      >
        ⠿
      </div>

      {separator}

      {TOOLS.map((tool, idx) => {
        const isActive = activeTool === tool.id;
        const prependSep = idx === 3 || tool.isSeparatorBefore;

        return (
          <React.Fragment key={tool.id}>
            {prependSep && separator}
            <button
              onClick={() => tool.id !== 'lock' && tool.id !== 'image' && setActiveTool(tool.id)}
              title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: 'none',
                cursor: tool.id === 'lock' || tool.id === 'image' ? 'default' : 'pointer',
                fontSize: 16,
                backgroundColor: isActive ? 'rgba(232,131,74,0.2)' : 'transparent',
                color: isActive ? 'var(--nt-accent)' : (tool.id === 'lock' || tool.id === 'image') ? 'var(--nt-text3)' : 'var(--nt-text2)',
                outline: isActive ? '1.5px solid var(--nt-accent)' : 'none',
                outlineOffset: '-1px',
                transition: 'background 0.12s, color 0.12s',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Instrument Sans', sans-serif",
                fontWeight: tool.id === 'shape-text' ? '700' : 'normal',
              }}
              onMouseEnter={(e: any) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = 'var(--nt-text)';
                }
              }}
              onMouseLeave={(e: any) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = (tool.id === 'lock' || tool.id === 'image') ? 'var(--nt-text3)' : 'var(--nt-text2)';
                }
              }}
            >
              {tool.icon}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
