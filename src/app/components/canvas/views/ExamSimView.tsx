import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import CardPreviewStage from '../CardPreviewStage';
import {
  applyExamResponse,
  buildExamResults,
  filterExamCards,
  getExamTimerMs,
  shuffleCards,
} from '../../../lib/canvas/reviewState';
import { useCanvasStorage } from '../../../hooks/useCanvasStorage';
import { useAuth } from '../../../context/AuthContext';
import { useKromeStore } from '../../../hooks/useKrome';

function formatTimer(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function ExamSimView() {
  const { user } = useAuth();
  const canvasStorage = useCanvasStorage();
  const { actions, state } = useKromeStore();
  
  const startTimestampRef = useRef(Date.now());
  const [cards, setCards] = useState<any[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [revealedMasks, setRevealedMasks] = useState<Record<string, string[]>>({});
  const [responses, setResponses] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  const examConfig = state.viewPayload || {
    density: 25,
    timerMode: 'off',
    customMinutes: 25,
    filterMode: 'wrong-shaky',
  };

  const timerBaseMs = getExamTimerMs(examConfig.timerMode, examConfig.customMinutes);

  useEffect(() => {
    let cancelled = false;

    async function loadExam() {
      const allCards = await canvasStorage.getAllCards();
      const filteredCards = filterExamCards(allCards || [], examConfig.filterMode, new Date());
      const selectedCards = shuffleCards(filteredCards).slice(0, examConfig.density);
      
      const imageEntries = selectedCards
        .map((card) => (card.screenshot_url ? [card.id, card.screenshot_url] : null))
        .filter(Boolean);

      if (cancelled) return;
      setCards(selectedCards);
      setImages(Object.fromEntries(imageEntries as any));
      setRemainingMs(timerBaseMs);
      startTimestampRef.current = Date.now();
    }

    loadExam();

    return () => {
      cancelled = true;
    };
  }, [examConfig.density, examConfig.filterMode, timerBaseMs, canvasStorage]);

  const finishExam = useCallback(async (nextResponses = responses, nextCards = cards) => {
    if (completed) return;

    const today = new Date();
    const updates = nextResponses
      .map((response) => {
        const card = nextCards.find((candidate) => candidate.id === response.cardId);
        return card ? applyExamResponse(card, response.result, today) : null;
      })
      .filter(Boolean);

    await Promise.all(
      updates.map((card) =>
        canvasStorage.updateCard(card.id, {
          status: card.status,
          next_review: card.next_review,
        }),
      ),
    );

    const results = buildExamResults(nextCards, nextResponses);
    await canvasStorage.updateConfig({ lastSessionScore: results.score });
    
    setCards((previousCards) =>
      previousCards.map((card) => updates.find((updated) => updated.id === card.id) || card),
    );
    setCompleted(true);
  }, [cards, completed, responses, canvasStorage]);

  useEffect(() => {
    if (paused || completed || timerBaseMs === null) return undefined;

    const interval = window.setInterval(() => {
      setRemainingMs((previousMs) => {
        if (previousMs === null) {
          return previousMs;
        }
        const nextMs = previousMs - 1000;
        if (nextMs <= 0) {
          window.clearInterval(interval);
          void finishExam();
          return 0;
        }
        return nextMs;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [completed, finishExam, paused, timerBaseMs]);

  useEffect(() => {
    if (timerBaseMs !== null || paused || completed) return undefined;

    const interval = window.setInterval(() => {
      setRemainingMs(Date.now() - startTimestampRef.current);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [completed, paused, timerBaseMs]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !completed) {
        event.preventDefault();
        setPaused((previous) => !previous);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [completed]);

  const activeCard = cards[currentIndex] || null;
  const results = useMemo(() => buildExamResults(cards, responses), [cards, responses]);

  const submitResponse = async (result: string) => {
    if (!activeCard) return;
    const nextResponses = [...responses, { cardId: activeCard.id, result }];
    setResponses(nextResponses);

    if (currentIndex >= cards.length - 1) {
      await finishExam(nextResponses, cards);
      return;
    }

    setCurrentIndex((previousIndex) => previousIndex + 1);
  };

  if (!cards.length && !completed) {
    return (
      <div className="exam-screen" style={{ background: 'var(--nt-bg)', minHeight: '100vh' }}>
        <div className="screen-empty-state" style={{ color: 'var(--nt-text3)' }}>No cards match this review mode yet.</div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="exam-screen" style={{ background: 'var(--nt-bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="exam-results-card" style={{ background: 'var(--nt-bg2)', border: '1px solid var(--nt-border)', padding: '32px', borderRadius: '12px', textAlign: 'center' }}>
          <span className="exam-results-kicker" style={{ color: 'var(--nt-text3)' }}>Session complete</span>
          <h2 style={{ color: 'var(--nt-text1)', fontSize: '48px', margin: '16px 0' }}>{results.score}%</h2>
          <div className="exam-results-breakdown" style={{ display: 'flex', gap: '16px', justifyContent: 'center', color: 'var(--nt-text2)' }}>
            <span>Got It: {results.gotIt}</span>
            <span>Shaky: {results.shaky}</span>
            <span>Missed It: {results.missed}</span>
          </div>
          <p className="exam-results-weak" style={{ color: 'var(--nt-red)', marginTop: '24px' }}>
            Weak topics: {results.weakTopics.length ? results.weakTopics.map((tag: string) => `#${tag}`).join(', ') : 'none'}
          </p>
          <div className="exam-results-actions" style={{ display: 'flex', gap: '12px', marginTop: '32px', justifyContent: 'center' }}>
            <button 
              type="button" 
              className="dashboard-launch-btn" 
              onClick={() => {
                // actions.setView('library', { state: { filters: ['wrong'] } })
              }}
              style={{ background: 'var(--nt-accent)', color: 'var(--nt-bg)', padding: '8px 16px', borderRadius: '4px' }}
            >
              REVIEW MISTAKES
            </button>
            <button 
              type="button" 
              className="library-drawer-btn library-drawer-btn-secondary" 
              onClick={() => {
                // actions.setView('dashboard')
              }}
              style={{ background: 'var(--nt-bg3)', color: 'var(--nt-text2)', padding: '8px 16px', borderRadius: '4px' }}
            >
              BACK TO DASHBOARD
            </button>
          </div>
        </div>
      </div>
    );
  }

  const timerDisplay = remainingMs === null ? formatTimer(Date.now() - startTimestampRef.current) : formatTimer(remainingMs);
  const timerClass =
    timerBaseMs !== null
      ? remainingMs <= timerBaseMs * 0.1
        ? 'danger'
        : remainingMs <= timerBaseMs * 0.25
          ? 'warning'
          : ''
      : '';

  return (
    <div className="exam-screen" style={{ background: 'var(--nt-bg)', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="exam-top-bar" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'var(--nt-bg2)', borderBottom: '1px solid var(--nt-border)' }}>
        <span style={{ color: 'var(--nt-text2)' }}>{`Card ${Math.min(currentIndex + 1, cards.length)} of ${cards.length}`}</span>
        <span className={`exam-timer ${timerClass}`} style={{ color: timerClass === 'danger' ? 'var(--nt-red)' : timerClass === 'warning' ? 'var(--nt-accent)' : 'var(--nt-text1)' }}>{timerDisplay}</span>
      </div>

      <div className="exam-main" style={{ flex: 1, position: 'relative' }}>
        <CardPreviewStage
          card={activeCard}
          imageSrc={images[activeCard.id]}
          interactiveMasks
          revealedMaskIds={revealedMasks[activeCard.id] || []}
          onToggleMask={(maskId: string) => {
            setRevealedMasks((previous) => {
              const current = previous[activeCard.id] || [];
              const next = current.includes(maskId)
                ? current.filter((id) => id !== maskId)
                : [...current, maskId];
              return { ...previous, [activeCard.id]: next };
            });
          }}
        />
        {paused && (
          <div className="exam-pause-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div className="exam-pause-card" style={{ background: 'var(--nt-bg2)', padding: '32px', borderRadius: '8px', textAlign: 'center' }}>
              <span style={{ color: 'var(--nt-text1)', display: 'block', marginBottom: '16px' }}>Paused</span>
              <button 
                type="button" 
                className="dashboard-launch-btn" 
                onClick={() => setPaused(false)}
                style={{ background: 'var(--nt-accent)', color: 'var(--nt-bg)', padding: '8px 24px', borderRadius: '4px' }}
              >
                RESUME
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="exam-bottom-bar" style={{ display: 'flex', padding: '16px', background: 'var(--nt-bg2)', borderTop: '1px solid var(--nt-border)', gap: '12px' }}>
        <button 
          type="button" 
          className="exam-response-btn got-it" 
          onClick={() => void submitResponse('got-it')}
          style={{ flex: 1, background: 'var(--nt-green)', color: 'var(--nt-bg)', padding: '12px', borderRadius: '4px', fontWeight: 'bold' }}
        >
          GOT IT
        </button>
        <button 
          type="button" 
          className="exam-response-btn shaky" 
          onClick={() => void submitResponse('shaky')}
          style={{ flex: 1, background: 'var(--nt-accent)', color: 'var(--nt-bg)', padding: '12px', borderRadius: '4px', fontWeight: 'bold' }}
        >
          SHAKY
        </button>
        <button 
          type="button" 
          className="exam-response-btn missed" 
          onClick={() => void submitResponse('missed-it')}
          style={{ flex: 1, background: 'var(--nt-red)', color: 'var(--nt-text1)', padding: '12px', borderRadius: '4px', fontWeight: 'bold' }}
        >
          MISSED IT
        </button>
      </div>
    </div>
  );
}
