import React, { useEffect, useRef, useState } from 'react';

const TOOLS = [
  { id: 'select', icon: '\u25b6' },
  { id: 'hand', icon: '\u270b' },
  { id: 'pen', icon: '\u270e' },
  { id: 'marker', icon: 'M' },
  { id: 'highlighter', icon: 'HL' },
  { id: 'mask', icon: '[]' },
  { id: 'arrow', icon: '\u2192' },
  { id: 'rect', icon: '\u25a1' },
  { id: 'eraser', icon: 'X' },
];
const SIZES = ['s', 'm', 'l'];
const TOOLBAR_COLORS = ['var(--nt-accent)', 'var(--nt-text)', 'var(--nt-blue)', 'var(--nt-green)', 'var(--nt-red)', '#F2C94C', '#9B84F0', '#000000'];

export default function AnnotationToolbar({
  activeTool,
  setActiveTool,
  activeColor,
  setActiveColor,
  activeSize,
  setActiveSize,
  showLinks,
  onToggleLinks,
  dueCount = 0,
  onReviewDue,
  notesOpen = false,
  onToggleNotes,
  onUndo,
  onHide,
}: any) {
  const [pos, setPos] = useState<{ x: number | null, y: number }>({ x: null, y: 20 });
  const dragging = useRef(false);
  const dragStart = useRef<any>({});
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pos.x === null && barRef.current) {
      const width = barRef.current.offsetWidth || 560;
      setPos({ x: (window.innerWidth - 52 - width) / 2, y: 20 });
    }
  }, [pos.x]);

  const onGripDown = (event: React.MouseEvent) => {
    dragging.current = true;
    dragStart.current = { mx: event.clientX, my: event.clientY, ox: pos.x, oy: pos.y };
    event.preventDefault();
  };

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: dragStart.current.ox + (event.clientX - dragStart.current.mx),
        y: dragStart.current.oy + (event.clientY - dragStart.current.my),
      });
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const separator = <div style={{ width: 1, height: 24, background: 'var(--nt-border)', margin: '0 4px' }} />;

  return (
    <div
      ref={barRef}
      style={{
        position: 'absolute',
        left: pos.x ?? 100,
        top: pos.y,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        backgroundColor: 'var(--nt-bg3)',
        border: '1px solid var(--nt-border)',
        borderRadius: 40,
        padding: '6px 12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        zIndex: 900,
        userSelect: 'none',
      }}
    >
      <div onMouseDown={onGripDown} style={{ cursor: 'grab', color: 'rgba(255,255,255,0.25)', padding: '0 6px', fontSize: 14 }}>
        ...
      </div>
      {separator}
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          title={tool.id}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontSize: tool.icon.length > 1 ? 10 : 14,
            backgroundColor: activeTool === tool.id ? 'rgba(232,131,74,0.2)' : 'transparent',
            color: activeTool === tool.id ? 'var(--nt-accent)' : 'var(--nt-text2)',
            outline: activeTool === tool.id ? '1px solid var(--nt-accent)' : 'none',
          }}
        >
          {tool.icon}
        </button>
      ))}
      {separator}
      {SIZES.map((size, index) => (
        <button
          key={size}
          onClick={() => setActiveSize(size)}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            fontSize: index === 0 ? 10 : index === 1 ? 13 : 16,
            backgroundColor: activeSize === size ? 'rgba(232,131,74,0.2)' : 'transparent',
            color: activeSize === size ? 'var(--nt-accent)' : 'var(--nt-text2)',
            fontWeight: 'bold',
          }}
        >
          {'\u25cf'}
        </button>
      ))}
      {separator}
      {TOOLBAR_COLORS.map((color) => (
        <div
          key={color}
          onClick={() => setActiveColor(color)}
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            backgroundColor: color,
            cursor: 'pointer',
            outline: activeColor === color ? `2px solid ${color}` : '2px solid transparent',
            outlineOffset: 2,
            flexShrink: 0,
          }}
        />
      ))}
      {separator}
      <button
        onClick={onToggleLinks}
        style={{
          minWidth: 56,
          height: 32,
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
          fontSize: 10,
          backgroundColor: showLinks ? 'rgba(232,131,74,0.2)' : 'transparent',
          color: showLinks ? 'var(--nt-accent)' : 'var(--nt-text2)',
          outline: showLinks ? '1px solid var(--nt-accent)' : 'none',
          padding: '0 8px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
        title="Show Links"
      >
        Links
      </button>
      <button
        onClick={onReviewDue}
        style={{
          minWidth: 86,
          height: 32,
          borderRadius: 8,
          border: 'none',
          cursor: dueCount > 0 ? 'pointer' : 'default',
          fontSize: 10,
          backgroundColor: dueCount > 0 ? 'rgba(232,131,74,0.2)' : 'transparent',
          color: dueCount > 0 ? 'var(--nt-accent)' : 'var(--nt-text3)',
          outline: dueCount > 0 ? '1px solid var(--nt-accent)' : 'none',
          padding: '0 8px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
        title="Review Due"
        disabled={dueCount === 0}
      >
        {`Due ${dueCount}`}
      </button>
      <button
        onClick={onToggleNotes}
        style={{
          minWidth: 56,
          height: 32,
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
          fontSize: 10,
          backgroundColor: notesOpen ? 'rgba(232,131,74,0.2)' : 'transparent',
          color: notesOpen ? 'var(--nt-accent)' : 'var(--nt-text2)',
          outline: notesOpen ? '1px solid var(--nt-accent)' : 'none',
          padding: '0 8px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
        title="Toggle Notes"
      >
        Notes
      </button>
      {separator}
      <button
        onClick={onUndo}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          backgroundColor: 'transparent',
          color: 'var(--nt-text2)',
        }}
        title="Undo"
      >
        {'\u21a9'}
      </button>
      <button
        onClick={onHide}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          backgroundColor: 'transparent',
          color: 'var(--nt-text2)',
        }}
        title="Hide toolbar (Ctrl+T)"
      >
        {'\u25cc'}
      </button>
    </div>
  );
}
