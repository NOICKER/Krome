import React from 'react';

const PALETTE = ['var(--nt-accent)', 'var(--nt-text)', 'var(--nt-blue)', 'var(--nt-green)', 'var(--nt-red)', '#F2C94C', '#9B84F0', '#000000'];

const SECTION_STYLE = {
  marginBottom: 14,
};

const LABEL_STYLE = {
  fontSize: 10,
  color: 'var(--nt-text2)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  marginBottom: 6,
  fontFamily: "'Instrument Sans', sans-serif",
};

function Swatch({ color, label, isActive, onClick }: any) {
  const isTransparent = color === 'transparent';
  return (
    <div
      onClick={() => onClick(color)}
      title={label || color}
      style={{
        width: 22,
        height: 22,
        borderRadius: 4,
        cursor: 'pointer',
        flexShrink: 0,
        position: 'relative',
        background: isTransparent
          ? 'linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, #fff 25%, #fff 75%, #ccc 75%)'
          : color,
        backgroundSize: isTransparent ? '8px 8px' : undefined,
        backgroundPosition: isTransparent ? '0 0, 4px 4px' : undefined,
        outline: isActive ? `2px solid ${isTransparent ? 'var(--nt-text2)' : color}` : '2px solid transparent',
        outlineOffset: 2,
        transition: 'outline 0.1s',
        boxShadow: isActive ? '0 0 0 1px var(--nt-bg3)' : undefined,
      }}
    />
  );
}

function SegmentButton({ label, isActive, onClick }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '5px 0',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 10,
        backgroundColor: isActive ? 'rgba(232,131,74,0.18)' : 'transparent',
        color: isActive ? 'var(--nt-accent)' : 'var(--nt-text2)',
        outline: isActive ? '1px solid rgba(232,131,74,0.4)' : '1px solid transparent',
        fontFamily: "'Instrument Sans', sans-serif",
        letterSpacing: '0.04em',
        transition: 'all 0.1s',
      }}
    >
      {label}
    </button>
  );
}

export default function PropertyPanel({ selectedShape, onShapeUpdate }: any) {
  if (!selectedShape) return null;

  const update = (patch: any) => onShapeUpdate(selectedShape.id, patch);

  const {
    strokeColor = 'var(--nt-accent)',
    backgroundColor = 'transparent',
    fillStyle = 'hachure',
    strokeWidth = 2,
    roughness = 1,
    opacity = 100,
  } = selectedShape;

  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 200,
        backgroundColor: 'var(--nt-bg3)',
        border: '1px solid var(--nt-border)',
        borderRadius: 14,
        padding: '14px 14px 12px',
        zIndex: 950,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        fontFamily: "'Instrument Sans', sans-serif",
        backdropFilter: 'blur(12px)',
      }}
    >
      <div style={SECTION_STYLE}>
        <div style={LABEL_STYLE}>Stroke</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {PALETTE.map((c) => (
            <Swatch key={c} color={c} isActive={strokeColor === c} onClick={(v: string) => update({ strokeColor: v })} />
          ))}
        </div>
      </div>

      <div style={SECTION_STYLE}>
        <div style={LABEL_STYLE}>Background</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <Swatch color="transparent" label="None" isActive={backgroundColor === 'transparent' || !backgroundColor} onClick={(v: string) => update({ backgroundColor: v })} />
          {PALETTE.map((c) => (
            <Swatch key={c} color={c} isActive={backgroundColor === c} onClick={(v: string) => update({ backgroundColor: v })} />
          ))}
        </div>
      </div>

      {selectedShape.type !== 'freedraw' && selectedShape.type !== 'text' && selectedShape.type !== 'line' && selectedShape.type !== 'arrow' && (
        <div style={SECTION_STYLE}>
          <div style={LABEL_STYLE}>Fill</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <SegmentButton label="Outline" isActive={fillStyle === 'none' || fillStyle === 'hachure'} onClick={() => update({ fillStyle: 'hachure' })} />
            <SegmentButton label="Hachure" isActive={fillStyle === 'hachure'} onClick={() => update({ fillStyle: 'hachure' })} />
            <SegmentButton label="Solid" isActive={fillStyle === 'solid'} onClick={() => update({ fillStyle: 'solid' })} />
          </div>
        </div>
      )}

      <div style={SECTION_STYLE}>
        <div style={LABEL_STYLE}>Stroke Width</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <SegmentButton label="Thin" isActive={strokeWidth === 1} onClick={() => update({ strokeWidth: 1 })} />
          <SegmentButton label="Bold" isActive={strokeWidth === 3} onClick={() => update({ strokeWidth: 3 })} />
          <SegmentButton label="X-Bold" isActive={strokeWidth === 6} onClick={() => update({ strokeWidth: 6 })} />
        </div>
      </div>

      {selectedShape.type !== 'freedraw' && selectedShape.type !== 'text' && (
        <div style={SECTION_STYLE}>
          <div style={LABEL_STYLE}>Sloppiness</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <SegmentButton label="Architect" isActive={roughness === 0} onClick={() => update({ roughness: 0 })} />
            <SegmentButton label="Artist" isActive={roughness === 1 || roughness === 1.5} onClick={() => update({ roughness: 1.5 })} />
            <SegmentButton label="Cartoon" isActive={roughness === 3} onClick={() => update({ roughness: 3 })} />
          </div>
        </div>
      )}

      <div style={{ ...SECTION_STYLE, marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={LABEL_STYLE}>Opacity</div>
          <div style={{ fontSize: 10, color: 'var(--nt-text2)' }}>{opacity}%</div>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={opacity}
          onChange={(e) => update({ opacity: Number(e.target.value) })}
          style={{
            width: '100%',
            accentColor: 'var(--nt-accent)',
            cursor: 'pointer',
          }}
        />
      </div>
    </div>
  );
}
