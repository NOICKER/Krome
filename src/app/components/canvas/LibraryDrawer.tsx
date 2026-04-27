import React, { useState } from 'react';

const STATUS_META: Record<string, { label: string, color: string }> = {
  wrong: { label: 'Wrong', color: 'var(--nt-red)' },
  shaky: { label: 'Shaky', color: 'var(--nt-accent)' },
  correct: { label: 'Correct', color: 'var(--nt-green)' },
  unseen: { label: 'Unseen', color: 'var(--nt-text3)' },
};

function formatField(value: any, fallback = 'Not set yet') {
  return value && String(value).trim() ? value : fallback;
}

function formatDate(value: any) {
  if (!value) return 'Unknown date';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown date';

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function LibraryDrawer({
  card,
  imageSrc,
  onClose,
  onOpenCanvas,
  onEditCard,
  onDeleteCard,
}: any) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (!card) {
    return null;
  }

  const status = STATUS_META[card.status] || STATUS_META.unseen;
  const tags = card.tags?.length ? card.tags : [];

  return (
    <aside className="library-drawer">
      <div className="library-drawer-header">
        <div>
          <span className="library-drawer-eyebrow">Card detail</span>
          <p className="library-drawer-caption">
            {card.canvasPos ? 'Already placed on canvas.' : 'Not on canvas yet. Open will place it first.'}
          </p>
        </div>
        <button className="library-drawer-close" onClick={onClose} type="button" aria-label="Close card detail">
          x
        </button>
      </div>

      <div className="library-drawer-shot">
        {imageSrc ? (
          <img src={imageSrc} alt="Selected card screenshot" />
        ) : (
          <div className="library-drawer-shot-placeholder">No screenshot preview</div>
        )}
      </div>

      <div className="library-drawer-meta">
        <div className="library-drawer-row">
          <span className="library-drawer-label">Status</span>
          <span
            className="library-status-badge"
            style={{ color: status.color, borderColor: status.color }}
          >
            {status.label}
          </span>
        </div>

        <div className="library-drawer-row">
          <span className="library-drawer-label">Error type</span>
          <span className="library-drawer-value">{formatField(card.errorType)}</span>
        </div>

        <div className="library-drawer-row">
          <span className="library-drawer-label">Created</span>
          <span className="library-drawer-value">{formatDate(card.createdAt)}</span>
        </div>

        <div className="library-drawer-row">
          <span className="library-drawer-label">Updated</span>
          <span className="library-drawer-value">{formatDate(card.updatedAt)}</span>
        </div>
      </div>

      <section className="library-drawer-section">
        <span className="library-drawer-label">Tags</span>
        <div className="library-tag-list">
          {tags.length ? (
            tags.map((tag: string) => (
              <span key={tag} className="tag-pill">
                #{tag}
              </span>
            ))
          ) : (
            <span className="library-drawer-empty-text">No tags yet</span>
          )}
        </div>
      </section>

      <section className="library-drawer-section">
        <span className="library-drawer-label">Notes</span>
        <div className="library-note-stack">
          <div className="library-note-block">
            <span className="library-note-heading">Summary</span>
            <p>{formatField(card.note, 'No summary note yet.')}</p>
          </div>
          <div className="library-note-block">
            <span className="library-note-heading">Why wrong</span>
            <p>{formatField(card.whyWrong, 'No reflection note yet.')}</p>
          </div>
        </div>
      </section>

      <div className="library-drawer-actions">
        <button className="library-drawer-btn library-drawer-btn-primary" onClick={onOpenCanvas} type="button">
          OPEN ON CANVAS
        </button>
        <button className="library-drawer-btn library-drawer-btn-secondary" onClick={onEditCard} type="button">
          EDIT
        </button>
        
        {showConfirmDelete ? (
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <button 
              className="library-drawer-btn library-drawer-btn-danger" 
              onClick={() => {
                setShowConfirmDelete(false);
                onDeleteCard();
              }} 
              type="button"
              style={{ flex: 1 }}
            >
              CONFIRM
            </button>
            <button 
              className="library-drawer-btn library-drawer-btn-secondary" 
              onClick={() => setShowConfirmDelete(false)} 
              type="button"
              style={{ flex: 1 }}
            >
              CANCEL
            </button>
          </div>
        ) : (
          <button className="library-drawer-btn library-drawer-btn-danger" onClick={() => setShowConfirmDelete(true)} type="button">
            DELETE
          </button>
        )}
      </div>
    </aside>
  );
}
