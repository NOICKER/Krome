import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { useCanvasStorage } from '../../hooks/useCanvasStorage';
import { normalizeTag } from '../../lib/canvas/connectionState';

const STATUS_COLORS: Record<string, string> = { wrong:'var(--nt-red)', shaky:'var(--nt-accent)', correct:'var(--nt-green)', unseen:'var(--nt-text3)' };
const normalizeTags = (tags: string[]) =>
  (tags || []).map((tag) => normalizeTag(tag)).filter((tag, index, allTags) => tag && allTags.indexOf(tag) === index);

const DetailsPanel = forwardRef(({ card, initialPos, onSave, onDismiss, onPanelDrag }: any, ref: any) => {
  const [tags, setTags]           = useState(normalizeTags(card.tags || []));
  const [customTag, setCustomTag]  = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [isTagInputFocused, setIsTagInputFocused] = useState(false);
  const [errorType, setErrorType] = useState(card.errorType || '');
  const [status, setStatus]       = useState(card.status || 'unseen');
  const [note, setNote]           = useState(card.note || '');
  const [whyWrong, setWhyWrong]   = useState(card.whyWrong || '');

  const { getAllCards } = useCanvasStorage();

  const [panelOffset, setPanelOffset] = useState({ x: 0, y: 0 });
  const isDraggingPanel = useRef(false);
  const dragStart = useRef<any>({});

  useEffect(() => {
    setTags(normalizeTags(card.tags || []));
    setCustomTag('');
    setErrorType(card.errorType || '');
    setStatus(card.status || 'unseen');
    setNote(card.note || '');
    setWhyWrong(card.whyWrong || '');
  }, [card.id, card.tags, card.errorType, card.status, card.note, card.whyWrong]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateTagSuggestions() {
      const allCards = await getAllCards();
      if (cancelled) return;
      setTagSuggestions(normalizeTags((allCards || []).flatMap((candidate: any) => candidate?.tags || [])));
    }

    hydrateTagSuggestions();

    return () => {
      cancelled = true;
    };
  }, [getAllCards]);

  const addTag = (value: string) => {
    const nextTag = normalizeTag(value);
    if (nextTag && !tags.includes(nextTag)) {
      setTags((previousTags) => [...previousTags, nextTag]);
    }
    setCustomTag('');
  };

  const removeTag = (tagToRemove: string) => {
    setTags((previousTags) => previousTags.filter((tag) => tag !== tagToRemove));
  };

  const handleGripMouseDown = (e: React.MouseEvent) => {
    isDraggingPanel.current = true;
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, offX: panelOffset.x, offY: panelOffset.y };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingPanel.current) return;
      const newOffsetX = dragStart.current.offX + (e.clientX - dragStart.current.mouseX);
      const newOffsetY = dragStart.current.offY + (e.clientY - dragStart.current.mouseY);
      setPanelOffset({ x: newOffsetX, y: newOffsetY });
      if (onPanelDrag) {
        onPanelDrag(newOffsetX, newOffsetY);
      }
    };
    const onUp = () => { isDraggingPanel.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [onPanelDrag, panelOffset]);

  const handleSave = () => {
    onSave({ tags: normalizeTags(tags), errorType, status, note, whyWrong });
  };

  const panelX = (initialPos?.x || 0) + panelOffset.x;
  const panelY = (initialPos?.y || 0) + panelOffset.y;
  const normalizedCustomTag = normalizeTag(customTag);
  const filteredTagSuggestions = tagSuggestions.filter(
    (tag) => !tags.includes(tag) && normalizedCustomTag && tag.includes(normalizedCustomTag),
  );

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: panelX,
        top:  panelY,
        width: 264,
        backgroundColor: 'var(--nt-bg2)',
        border: '1px solid var(--nt-border)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        overflow: 'hidden',
        fontFamily: "'Instrument Sans', sans-serif",
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      <div
        onMouseDown={handleGripMouseDown}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          cursor: 'grab',
          backgroundColor: 'var(--nt-bg3)',
          userSelect: 'none',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)">
          <circle cx="9" cy="6" r="2"/><circle cx="15" cy="6" r="2"/>
          <circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/>
          <circle cx="9" cy="18" r="2"/><circle cx="15" cy="18" r="2"/>
        </svg>
        <span style={{ color: 'var(--nt-text3)', fontSize: 11, fontFamily:"'JetBrains Mono',monospace" }}>card details</span>
        <div style={{ flex:1 }}/>
        <button onClick={onDismiss} style={{ background:'none', border:'none', color:'var(--nt-text3)', cursor:'pointer', fontSize:16, lineHeight:1 }}>×</button>
      </div>

      <div style={{ padding: '12px', display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ position:'relative' }}>
          <div style={{ fontSize:10, color:'var(--nt-text3)', marginBottom:6, letterSpacing:'0.08em', textTransform:'uppercase' }}>Tags</div>
          <div style={{
            minHeight: 44,
            display:'flex',
            flexWrap:'wrap',
            alignItems:'center',
            gap:6,
            padding:'8px',
            background:'rgba(255,255,255,0.04)',
            border:'1px solid var(--nt-border)',
            borderRadius:10,
          }}>
            {tags.map((tag) => (
              <span key={tag} style={{
                display:'inline-flex',
                alignItems:'center',
                gap:6,
                padding:'4px 8px',
                borderRadius:20,
                backgroundColor:'var(--nt-accent)',
                color:'#fff',
                fontSize:11,
                lineHeight:1,
              }}>
                <span>#{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  style={{
                    background:'none',
                    border:'none',
                    color:'#fff',
                    cursor:'pointer',
                    padding:0,
                    fontSize:13,
                    lineHeight:1,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              value={customTag}
              onChange={(event) => setCustomTag(event.target.value)}
              onFocus={() => setIsTagInputFocused(true)}
              onBlur={() => setIsTagInputFocused(false)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ',') {
                  event.preventDefault();
                  addTag(customTag);
                }
              }}
              placeholder={tags.length ? '+ tag' : 'Type a tag and press Enter'}
              style={{
                flex:1,
                minWidth:72,
                background:'transparent',
                border:'none',
                color:'var(--nt-text)',
                outline:'none',
                fontSize:12,
                padding:0,
                fontFamily:"'Instrument Sans', sans-serif",
              }}
            />
          </div>
          {isTagInputFocused && filteredTagSuggestions.length > 0 && (
            <div style={{
              position:'absolute',
              left:0,
              right:0,
              top:'100%',
              marginTop:6,
              background:'var(--nt-bg3)',
              border:'1px solid var(--nt-border)',
              borderRadius:10,
              boxShadow:'0 10px 30px rgba(0,0,0,0.35)',
              overflow:'hidden',
              zIndex:5,
            }}>
              {filteredTagSuggestions.slice(0, 8).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    addTag(tag);
                  }}
                  style={{
                    width:'100%',
                    textAlign:'left',
                    background:'transparent',
                    border:'none',
                    color:'var(--nt-text)',
                    cursor:'pointer',
                    padding:'8px 10px',
                    fontSize:12,
                    fontFamily:"'Instrument Sans', sans-serif",
                  }}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize:10, color:'var(--nt-text3)', marginBottom:6, letterSpacing:'0.08em', textTransform:'uppercase' }}>Error Type</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {['conceptual','calculation','misread','careless'].map(e => (
              <button key={e} onClick={() => setErrorType(errorType===e ? '' : e)} style={{
                padding:'6px 4px', borderRadius:6, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.05em',
                fontFamily:"'Bebas Neue', sans-serif", fontSize: 14,
                backgroundColor: errorType===e ? 'var(--nt-accent)' : 'rgba(255,255,255,0.04)',
                color: errorType===e ? '#fff' : 'var(--nt-text2)',
                border: `1px solid ${errorType===e ? 'var(--nt-accent)' : 'var(--nt-border)'}`,
              }}>{e}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize:10, color:'var(--nt-text3)', marginBottom:6, letterSpacing:'0.08em', textTransform:'uppercase' }}>Status</div>
          <div style={{ display:'flex', gap:6 }}>
            {['wrong','shaky','correct'].map(s => (
              <button key={s} onClick={() => setStatus(s)} style={{
                flex:1, padding:'6px 0', borderRadius:6, cursor:'pointer', textTransform:'uppercase',
                fontFamily:"'Bebas Neue', sans-serif", letterSpacing:'0.05em', fontSize: 13,
                backgroundColor: status===s ? STATUS_COLORS[s] : 'rgba(255,255,255,0.04)',
                color: status===s ? '#fff' : 'var(--nt-text2)',
                border: `1px solid ${status===s ? STATUS_COLORS[s] : 'var(--nt-border)'}`,
              }}>{s}</button>
            ))}
          </div>
        </div>

        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="what's happening here..."
          rows={2}
          style={{
            background:'rgba(255,255,255,0.04)', border:'1px solid var(--nt-border)',
            borderRadius:6, color:'var(--nt-text)', padding:'8px', fontSize:12, resize:'none', outline:'none',
            fontFamily:"'Instrument Sans', sans-serif",
          }}
        />

        <input
          value={whyWrong}
          onChange={e => setWhyWrong(e.target.value)}
          placeholder="your honest thought..."
          style={{
            background:'rgba(255,255,255,0.04)', border:'1px solid var(--nt-border)',
            borderRadius:6, color:'var(--nt-text)', padding:'8px', fontSize:12, outline:'none',
            fontFamily:"'Instrument Sans', sans-serif",
          }}
        />

        <button onClick={handleSave} style={{
          backgroundColor:'var(--nt-accent)', color:'#0C0C0D', border:'none',
          borderRadius:8, padding:'10px', fontSize:20, cursor:'pointer',
          fontFamily:"'Bebas Neue', sans-serif", letterSpacing:'0.05em',
        }}>SAVE CARD</button>
      </div>
    </div>
  );
});

export default DetailsPanel;
