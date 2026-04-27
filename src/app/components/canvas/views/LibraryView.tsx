import React, { useCallback, useEffect, useMemo, useState } from 'react';
import LibraryDrawer from '../LibraryDrawer';
import { getNextCanvasCardPosition } from '../../../lib/canvas/canvasState';
import {
  cardMatchesLibraryFilters,
  isCardDueForReview,
  matchesLibraryQuery,
  sortLibraryCards,
} from '../../../lib/canvas/libraryState';
import { useCanvasStorage } from '../../../hooks/useCanvasStorage';
import { useAuth } from '../../../context/AuthContext';
import { useKromeStore } from '../../../hooks/useKrome';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'weakest', label: 'Weakest first' },
  { value: 'most-errors', label: 'Most errors first' },
  { value: 'topic', label: 'By topic' },
];

const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'wrong', label: 'Wrong only' },
  { id: 'shaky', label: 'Shaky only' },
  { id: 'unseen', label: 'Unseen only' },
  { id: 'correct', label: 'Correct only' },
  { id: 'has-mask', label: 'Has mask' },
  { id: 'due-review', label: 'Due for review' },
];

export default function LibraryView() {
  const { user } = useAuth();
  const canvasStorage = useCanvasStorage();
  const { actions } = useKromeStore();
  
  const [cards, setCards] = useState<any[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [activeFilters, setActiveFilters] = useState(['all']);
  
  const [confirmState, setConfirmState] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const loadLibrary = useCallback(async () => {
    try {
      const fetchedCards = await canvasStorage.getAllCards();
      const storedPositions = await canvasStorage.getCanvasPositions('main');
      
      // Merge positions into cards so library knows what is on canvas
      const hydratedCards = fetchedCards.map((card) => {
        const pos = storedPositions.find((p) => p.card_id === card.id);
        return {
          ...card,
          canvasPos: pos ? { x: pos.x, y: pos.y } : undefined,
        };
      });

      setCards(hydratedCards);

      const imageEntries = hydratedCards
        .map((card) => (card.screenshot_url ? [card.id, card.screenshot_url] : null))
        .filter(Boolean);
      setImages(Object.fromEntries(imageEntries as any));
    } catch (error) {
      console.error('Failed to load library', error);
    }
  }, [canvasStorage]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  // TODO: Route intent reading in KROME if needed
  /*
  useEffect(() => {
    const routeState = location.state;
    if (!routeState) return;

    if (Array.isArray(routeState.filters) && routeState.filters.length) {
      setActiveFilters(routeState.filters);
    }
    if (typeof routeState.searchQuery === 'string') {
      setSearchQuery(routeState.searchQuery);
    }
  }, [location.state]);
  */

  useEffect(() => {
    if (selectedCardId && !cards.some((card) => card.id === selectedCardId)) {
      setSelectedCardId(null);
    }
  }, [cards, selectedCardId]);

  const filteredCards = useMemo(() => {
    const today = new Date();
    return sortLibraryCards(
      cards.filter((card) => cardMatchesLibraryFilters(card, activeFilters, today)),
      sortBy,
    );
  }, [activeFilters, cards, sortBy]);

  useEffect(() => {
    if (selectedCardId && !filteredCards.some((card) => card.id === selectedCardId)) {
      setSelectedCardId(null);
    }
  }, [filteredCards, selectedCardId]);

  const activeCard = useMemo(
    () => filteredCards.find((card) => card.id === selectedCardId) || null,
    [filteredCards, selectedCardId],
  );

  const visibleCards = useMemo(
    () => filteredCards.map((card) => ({ card, matchesSearch: matchesLibraryQuery(card, searchQuery) })),
    [filteredCards, searchQuery],
  );
  
  const dueCount = useMemo(
    () => cards.filter((card) => isCardDueForReview(card, new Date())).length,
    [cards],
  );

  const ensureCardOnCanvas = useCallback(async (card: any) => {
    if (card.canvasPos) {
      return card;
    }

    const existingCardCount = cards.filter((candidate) => candidate.canvasPos).length;
    const nextCanvasPos = getNextCanvasCardPosition({ existingCardCount });
    
    // Save new position
    await canvasStorage.saveCanvasPositions([{
      id: `pos_${card.id}`,
      user_id: user?.id || '',
      canvas_id: 'main',
      card_id: card.id,
      x: nextCanvasPos.x,
      y: nextCanvasPos.y,
      updated_at: Date.now()
    }]);

    const nextCard = { ...card, canvasPos: nextCanvasPos };
    setCards((previousCards) =>
      previousCards.map((candidate) => (candidate.id === nextCard.id ? nextCard : candidate)),
    );
    return nextCard;
  }, [cards, canvasStorage, user]);

  const openCardOnCanvas = useCallback(async (card: any, { openDetails = false } = {}) => {
    const placedCard = await ensureCardOnCanvas(card);
    if (!placedCard) return;

    actions.setView('canvas', { focusCardId: placedCard.id, openDetails });
  }, [ensureCardOnCanvas, actions]);

  const handleDeleteCard = useCallback((card: any) => {
    setConfirmState({
      message: `Delete "${card.note || card.id}" from the library?`,
      onConfirm: async () => {
        await canvasStorage.deleteCard(card.id);
        setCards((previousCards) => previousCards.filter((candidate) => candidate.id !== card.id));
        setImages((previousImages) => {
          const nextImages = { ...previousImages };
          delete nextImages[card.id];
          return nextImages;
        });
        setSelectedCardId((previousCardId) => (previousCardId === card.id ? null : previousCardId));
        setConfirmState(null);
      }
    });
  }, [canvasStorage]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'wrong': return 'var(--nt-red)';
      case 'shaky': return 'var(--nt-accent)';
      case 'correct': return 'var(--nt-green)';
      default: return 'var(--nt-text3)'; // unseen or anything else
    }
  };

  const toggleFilter = useCallback((filterId: string) => {
    setActiveFilters((previousFilters) => {
      if (filterId === 'all') {
        return ['all'];
      }

      const baseFilters = previousFilters.filter((candidate) => candidate !== 'all');
      const nextFilters = baseFilters.includes(filterId)
        ? baseFilters.filter((candidate) => candidate !== filterId)
        : [...baseFilters, filterId];

      return nextFilters.length ? nextFilters : ['all'];
    });
  }, []);

  useEffect(() => {
    if (!selectedCardId) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedCardId(null);
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target) return;
      if (target.closest('.library-drawer') || target.closest('.card-item')) return;
      setSelectedCardId(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [selectedCardId]);

  return (
    <div className="library-screen" style={{ background: 'var(--nt-bg)', minHeight: '100vh', height: '100vh', overflow: 'auto' }}>
      {confirmState && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ position: 'fixed' }}>
          <div className="bg-[#121212] border border-[#333] rounded-lg p-6 max-w-sm w-full shadow-2xl" style={{ background: 'var(--nt-bg)', borderColor: 'var(--nt-border)' }}>
            <h3 className="text-white text-lg font-bold mb-4" style={{ color: 'var(--nt-text1)' }}>Confirm Deletion</h3>
            <p className="text-gray-400 mb-6" style={{ color: 'var(--nt-text2)' }}>{confirmState.message}</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setConfirmState(null)}
                className="px-4 py-2 rounded transition-colors"
                style={{ color: 'var(--nt-text2)' }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmState.onConfirm}
                className="px-4 py-2 rounded transition-colors"
                style={{ background: 'rgba(255, 0, 0, 0.2)', color: 'var(--nt-red)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="library-empty">
          <span style={{ color: 'var(--nt-text3)' }}>no cards yet.</span>
        </div>
      ) : (
        <div className="library-layout">
          <div className="library-grid-panel">
            {dueCount > 0 && (
              <div className="library-review-banner" style={{ background: 'var(--nt-accent-transparent)', borderColor: 'var(--nt-accent)', color: 'var(--nt-accent)' }}>
                <span>{`${dueCount} cards due for review today.`}</span>
                <button
                  type="button"
                  style={{ background: 'var(--nt-accent)', color: 'var(--nt-bg)' }}
                  onClick={() => {
                    // TODO: KROME routing to exam sim view
                  }}
                >
                  START REVIEW
                </button>
              </div>
            )}

            <div className="library-toolbar">
              <div className="library-search">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="search tags, notes, OCR..."
                  style={{ background: 'var(--nt-bg2)', color: 'var(--nt-text1)', border: '1px solid var(--nt-border)' }}
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} style={{ color: 'var(--nt-text3)' }}>
                    Clear
                  </button>
                )}
              </div>

              <label className="library-sort" style={{ color: 'var(--nt-text2)' }}>
                <span>Sort</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} style={{ background: 'var(--nt-bg2)', color: 'var(--nt-text1)', border: '1px solid var(--nt-border)' }}>
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="library-filter-row">
              {FILTER_OPTIONS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={`library-filter-pill${activeFilters.includes(filter.id) ? ' active' : ''}`}
                  onClick={() => toggleFilter(filter.id)}
                  style={{ 
                    background: activeFilters.includes(filter.id) ? 'var(--nt-accent)' : 'var(--nt-bg2)',
                    color: activeFilters.includes(filter.id) ? 'var(--nt-bg)' : 'var(--nt-text2)',
                    border: '1px solid var(--nt-border)'
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="card-grid">
              {visibleCards.map(({ card, matchesSearch }) => (
                <div
                  key={card.id}
                  className={`card-item${selectedCardId === card.id ? ' active' : ''}${matchesSearch ? '' : ' muted'}`}
                  onClick={() => setSelectedCardId(card.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedCardId(card.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  style={{ 
                    border: selectedCardId === card.id ? '2px solid var(--nt-accent)' : '1px solid var(--nt-border)',
                    background: 'var(--nt-bg2)',
                    opacity: matchesSearch ? 1 : 0.4 
                  }}
                >
                  <div className="card-img-container" style={{ borderBottom: '1px solid var(--nt-border)' }}>
                    {images[card.id] ? (
                      <img src={images[card.id]} alt="card screenshot" />
                    ) : (
                      <div className="card-img-placeholder" style={{ background: 'var(--nt-bg)' }}></div>
                    )}
                    <div
                      className="status-dot"
                      style={{ backgroundColor: getStatusColor(card.status) }}
                      title={`Status: ${card.status || 'unseen'}`}
                    ></div>
                  </div>
                  <div className="card-info">
                    <div className="card-info-top">
                      {card.tags && card.tags.length > 0 ? (
                        <span className="tag-pill" style={{ background: 'var(--nt-bg3)', color: 'var(--nt-text2)' }}>#{card.tags[0]}</span>
                      ) : (
                        <span className="card-meta-muted" style={{ color: 'var(--nt-text3)' }}>untagged</span>
                      )}
                      {card.canvasPos && <span className="card-canvas-chip" style={{ background: 'var(--nt-accent-transparent)', color: 'var(--nt-accent)' }}>on canvas</span>}
                    </div>
                    <p className="card-note" style={{ color: 'var(--nt-text1)' }}>{card.note || 'no note yet.'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <LibraryDrawer
        card={activeCard}
        imageSrc={activeCard ? images[activeCard.id] : null}
        onClose={() => setSelectedCardId(null)}
        onOpenCanvas={() => activeCard && openCardOnCanvas(activeCard)}
        onEditCard={() => activeCard && openCardOnCanvas(activeCard, { openDetails: true })}
        onDeleteCard={() => activeCard && handleDeleteCard(activeCard)}
      />
    </div>
  );
}
