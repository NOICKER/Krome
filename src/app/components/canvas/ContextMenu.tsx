import React, { useEffect, useRef, useState } from 'react';

const DIVIDER = 'divider';

export default function ContextMenu({ pos, type = 'canvas', onAction, onClose }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  useEffect(() => {
    if (!pos) return undefined;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [pos, onClose]);

  if (!pos) return null;

  const canvasItems = [
    { label: 'Paste image', action: 'paste' },
    { label: 'New sticky note', action: 'sticky' },
    DIVIDER,
    { label: 'Zoom to fit', action: 'zoom-fit' },
    { label: 'Zoom 100%', action: 'zoom-100' },
  ];

  const cardItems = [
    { label: 'Edit card', action: 'edit' },
    { label: 'Duplicate', action: 'duplicate' },
    DIVIDER,
    { label: 'Delete card', action: 'delete', danger: true },
  ];

  const multiItems = [
    { label: 'Duplicate all', action: 'duplicate-multi' },
    DIVIDER,
    { label: 'Delete selected', action: 'delete-multi', danger: true },
  ];

  const stickyItems = [
    { label: 'Edit sticky', action: 'edit-sticky' },
    DIVIDER,
    { label: 'Delete sticky', action: 'delete-sticky', danger: true },
  ];

  const shapeItems = [
    { label: 'Bring to Front', action: 'shape-bring-front' },
    { label: 'Send to Back', action: 'shape-send-back' },
    DIVIDER,
    { label: 'Delete shape', action: 'shape-delete', danger: true },
  ];

  const items =
    type === 'card'
      ? cardItems
      : type === 'multi'
        ? multiItems
        : type === 'sticky'
          ? stickyItems
          : type === 'shape'
            ? shapeItems
            : canvasItems;

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: pos.x,
    top: pos.y,
    backgroundColor: 'var(--nt-bg3)',
    border: '1px solid var(--nt-border)',
    borderRadius: 10,
    padding: '4px 0',
    zIndex: 3000,
    fontFamily: "'Instrument Sans', sans-serif",
    fontSize: 13,
    color: 'var(--nt-text)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
    minWidth: 190,
    userSelect: 'none',
  };

  const itemStyle = (danger: boolean | undefined): React.CSSProperties => ({
    padding: '8px 14px',
    cursor: 'pointer',
    color: danger ? 'var(--nt-red)' : 'var(--nt-text)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderRadius: 6,
    margin: '0 4px',
    transition: 'background 0.1s',
  });

  if (confirmAction) {
    return (
      <div ref={ref} style={menuStyle} onMouseDown={(event) => event.stopPropagation()}>
        <div style={{ padding: '8px 14px', color: 'var(--nt-text2)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Are you sure?</div>
        <div
          style={itemStyle(true)}
          onClick={() => {
            onAction(confirmAction);
            onClose();
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = 'transparent';
          }}
        >
          CONFIRM DELETE
        </div>
        <div
          style={itemStyle(false)}
          onClick={() => setConfirmAction(null)}
          onMouseEnter={(event) => {
            event.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = 'transparent';
          }}
        >
          CANCEL
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} style={menuStyle} onMouseDown={(event) => event.stopPropagation()}>
      {items.map((item: any, index: number) =>
        item === DIVIDER ? (
          <div
            key={index}
            style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }}
          />
        ) : (
          <div
            key={item.action}
            style={itemStyle(item.danger)}
            onClick={() => {
              if (item.danger) {
                setConfirmAction(item.action);
              } else {
                onAction(item.action);
                onClose();
              }
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = 'transparent';
            }}
          >
            {item.label}
          </div>
        ),
      )}
    </div>
  );
}
