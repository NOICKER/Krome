import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCanvasStorage } from '../../../hooks/useCanvasStorage';
import { useAuth } from '../../../context/AuthContext';
import { useKromeStore } from '../../../hooks/useKrome';

import {
  buildDashboardStats,
  buildErrorMatrix,
  getMatrixCellTone,
} from '../../../lib/canvas/dashboardState';
import {
  buildInsightSummary,
  extractGeminiText,
  normalizeInsightList,
  shouldRunInsights,
} from '../../../lib/canvas/insightState';

const ERROR_COLUMNS = ['conceptual', 'calculation', 'misread', 'careless'];

async function fetchGeminiInsights(apiKey: string, prompt: string) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      },
    );

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const insights = normalizeInsightList(extractGeminiText(payload));
    return insights.length ? insights : [];
  } catch (error) {
    return [];
  }
}

function formatFilterLabel(filterMode: string) {
  if (filterMode === 'wrong-only') return 'Wrong only';
  if (filterMode === 'all-weak') return 'All weak';
  return 'Wrong + shaky';
}

export default function DashboardView() {
  const { user } = useAuth();
  const canvasStorage = useCanvasStorage();
  const { actions } = useKromeStore();
  
  const requestRef = useRef(false);
  const [cards, setCards] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [examConfig, setExamConfig] = useState({
    density: 50,
    timerMode: 'off',
    customMinutes: 25,
    filterMode: 'wrong-shaky',
  });

  const loadDashboard = useCallback(async () => {
    const [nextCards, nextConfig] = await Promise.all([
      canvasStorage.getAllCards(),
      canvasStorage.getConfig(),
    ]);
    setCards(nextCards || []);
    setConfig(nextConfig || {});
  }, [canvasStorage]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(
    () => buildDashboardStats(cards, config || {}, new Date()),
    [cards, config],
  );
  const matrixRows = useMemo(() => buildErrorMatrix(cards), [cards]);
  const insightCards = (config?.insights || []).slice(0, 3);

  const runInsights = useCallback(async (force = false) => {
    if (!config?.geminiApiKey || requestRef.current) return;
    if (!force && !shouldRunInsights(config, cards.length, new Date())) return;

    requestRef.current = true;
    try {
      const summary = buildInsightSummary(cards);
      const prompt =
        `You are a silent study coach analyzing a student's exam prep mistake patterns. ` +
        `Based on this data, give me exactly 3 short observations (max 15 words each). ` +
        `Be specific, not generic. No encouragement. Just facts. Format as JSON array of strings. ` +
        `Data: ${JSON.stringify(summary)}`;
      const insights = await fetchGeminiInsights(config.geminiApiKey, prompt);
      if (!insights.length) return;

      const nextConfig = {
        ...config,
        lastInsightRun: new Date().toISOString(),
        insights,
        lastInsightCardCount: cards.length,
      };
      const result = await canvasStorage.updateConfig(nextConfig);
      if (result?.success && result.config) {
        setConfig(result.config);
      } else {
        setConfig(nextConfig);
      }
    } catch (error) {
      // Silent by design.
    } finally {
      requestRef.current = false;
    }
  }, [cards, config, canvasStorage]);

  useEffect(() => {
    if (!config) return;
    void runInsights(false);
  }, [config, runInsights]);

  if (!cards.length) {
    return (
      <div className="dashboard-screen" style={{ background: 'var(--nt-bg)', minHeight: '100%' }}>
        <div className="screen-empty-state" style={{ color: 'var(--nt-text3)' }}>save some cards first to see your patterns.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-screen" style={{ background: 'var(--nt-bg)', minHeight: '100%' }}>
      <section className="dashboard-hero">
        <h2 style={{ color: 'var(--nt-text1)' }}>KROME Canvas.</h2>
        <p style={{ color: 'var(--nt-text2)' }}>your weak spots, at a glance.</p>
      </section>

      <section className="dashboard-stat-grid">
        <article className="dashboard-stat-card" style={{ background: 'var(--nt-bg2)', border: '1px solid var(--nt-border)' }}>
          <span style={{ color: 'var(--nt-text2)' }}>Total Cards</span>
          <strong style={{ color: 'var(--nt-text1)' }}>{stats.totalCards}</strong>
        </article>
        <article className="dashboard-stat-card" style={{ background: 'var(--nt-bg2)', border: '1px solid var(--nt-border)' }}>
          <span style={{ color: 'var(--nt-text2)' }}>Due for Review</span>
          <strong className={stats.dueCount > 0 ? 'accent' : ''} style={{ color: stats.dueCount > 0 ? 'var(--nt-accent)' : 'var(--nt-text1)' }}>{stats.dueCount}</strong>
        </article>
        <article className="dashboard-stat-card" style={{ background: 'var(--nt-bg2)', border: '1px solid var(--nt-border)' }}>
          <span style={{ color: 'var(--nt-text2)' }}>Weak Areas</span>
          <strong style={{ color: 'var(--nt-text1)' }}>{stats.weakAreaCount}</strong>
        </article>
        <article className="dashboard-stat-card" style={{ background: 'var(--nt-bg2)', border: '1px solid var(--nt-border)' }}>
          <span style={{ color: 'var(--nt-text2)' }}>Last Session Score</span>
          <strong style={{ color: 'var(--nt-text1)' }}>{stats.lastSessionScore}%</strong>
        </article>
      </section>

      <section className="dashboard-panel" style={{ background: 'var(--nt-bg2)', border: '1px solid var(--nt-border)' }}>
        <div className="dashboard-panel-header">
          <div>
            <h3 style={{ color: 'var(--nt-text1)' }}>ERROR TYPE MATRIX</h3>
            <p style={{ color: 'var(--nt-text3)' }}>correlation between topics and failure points</p>
          </div>
          <span className="dashboard-legend" style={{ color: 'var(--nt-text3)' }}>LOW ... HIGH</span>
        </div>

        <div className="dashboard-matrix">
          <div className="dashboard-matrix-row dashboard-matrix-head" style={{ color: 'var(--nt-text2)', borderBottom: '1px solid var(--nt-border)' }}>
            <span>Topic</span>
            {ERROR_COLUMNS.map((column) => (
              <span key={column}>{column}</span>
            ))}
          </div>
          {matrixRows.map((row) => (
            <div key={row.tag} className="dashboard-matrix-row" style={{ borderBottom: '1px solid var(--nt-border)' }}>
              <span className="dashboard-matrix-tag" style={{ color: 'var(--nt-text2)' }}>#{row.tag}</span>
              {ERROR_COLUMNS.map((column) => (
                <span
                  key={column}
                  className="dashboard-matrix-cell"
                  style={{ backgroundColor: getMatrixCellTone(row[column]) }}
                >
                  {row[column]}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-panel" style={{ background: 'var(--nt-bg2)', border: '1px solid var(--nt-border)' }}>
        <div className="dashboard-panel-header">
          <div>
            <h3 style={{ color: 'var(--nt-text1)' }}>PATTERN INSIGHTS</h3>
            <p style={{ color: 'var(--nt-text3)' }}>silent observations from your current mistake stack</p>
          </div>
          <button
            className="dashboard-refresh-btn"
            type="button"
            onClick={() => void runInsights(true)}
            aria-label="Refresh pattern insights"
            style={{ color: 'var(--nt-text2)', background: 'var(--nt-bg3)', border: '1px solid var(--nt-border)' }}
          >
            ↻
          </button>
        </div>
        <div className="dashboard-insight-grid">
          {(insightCards.length ? insightCards : ['Add a Gemini key in Settings to unlock silent insight cards.']).map((insight: string) => (
            <article key={insight} className="dashboard-insight-card" style={{ background: 'var(--nt-bg3)', border: '1px solid var(--nt-border)', color: 'var(--nt-text1)' }}>
              {insight}
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-panel dashboard-exam-panel" style={{ background: 'var(--nt-bg2)', border: '1px solid var(--nt-border)' }}>
        <div className="dashboard-exam-controls">
          <div className="dashboard-control-group">
            <span className="dashboard-control-label" style={{ color: 'var(--nt-text2)' }}>Card density</span>
            <input
              type="range"
              min="25"
              max="100"
              step="5"
              value={examConfig.density}
              onChange={(event) => setExamConfig((previous) => ({ ...previous, density: Number(event.target.value) }))}
            />
            <span className="dashboard-control-value" style={{ color: 'var(--nt-text1)' }}>{examConfig.density} cards</span>
          </div>

          <div className="dashboard-control-group">
            <span className="dashboard-control-label" style={{ color: 'var(--nt-text2)' }}>Timer</span>
            <div className="dashboard-pill-row">
              {[
                { id: 'off', label: 'OFF' },
                { id: '45:00', label: '45:00' },
                { id: 'custom', label: 'CUSTOM' },
              ].map((option) => (
                <button
                  key={option.id}
                  className={`dashboard-pill${examConfig.timerMode === option.id ? ' active' : ''}`}
                  type="button"
                  onClick={() => setExamConfig((previous) => ({ ...previous, timerMode: option.id }))}
                  style={{
                    background: examConfig.timerMode === option.id ? 'var(--nt-accent)' : 'var(--nt-bg3)',
                    color: examConfig.timerMode === option.id ? 'var(--nt-bg)' : 'var(--nt-text2)',
                    border: '1px solid var(--nt-border)',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {examConfig.timerMode === 'custom' && (
              <input
                className="dashboard-inline-input"
                type="number"
                min="1"
                max="180"
                value={examConfig.customMinutes}
                onChange={(event) =>
                  setExamConfig((previous) => ({ ...previous, customMinutes: Number(event.target.value) || 1 }))
                }
                style={{ background: 'var(--nt-bg3)', color: 'var(--nt-text1)', border: '1px solid var(--nt-border)' }}
              />
            )}
          </div>

          <div className="dashboard-control-group">
            <span className="dashboard-control-label" style={{ color: 'var(--nt-text2)' }}>Filter</span>
            <div className="dashboard-pill-row">
              {[
                { id: 'wrong-only', label: 'Wrong only' },
                { id: 'wrong-shaky', label: 'Wrong+Shaky' },
                { id: 'all-weak', label: 'All weak' },
              ].map((option) => (
                <button
                  key={option.id}
                  className={`dashboard-pill${examConfig.filterMode === option.id ? ' active' : ''}`}
                  type="button"
                  onClick={() => setExamConfig((previous) => ({ ...previous, filterMode: option.id }))}
                  style={{
                    background: examConfig.filterMode === option.id ? 'var(--nt-accent)' : 'var(--nt-bg3)',
                    color: examConfig.filterMode === option.id ? 'var(--nt-bg)' : 'var(--nt-text2)',
                    border: '1px solid var(--nt-border)',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="dashboard-launch-card" style={{ background: 'var(--nt-bg3)', border: '1px solid var(--nt-border)' }}>
          <h3 style={{ color: 'var(--nt-text1)' }}>EXAM SIM</h3>
          <p style={{ color: 'var(--nt-text2)' }}>review your wrong and shaky cards under timed conditions. no hints, no edits.</p>
          <span className="dashboard-launch-meta" style={{ color: 'var(--nt-text3)' }}>
            {formatFilterLabel(examConfig.filterMode)} • {examConfig.timerMode === 'custom' ? `${examConfig.customMinutes} min` : examConfig.timerMode}
          </span>
          <button
            className="dashboard-launch-btn"
            type="button"
            onClick={() => {
              actions.setView('examSim', examConfig);
            }}
            style={{ background: 'var(--nt-accent)', color: 'var(--nt-bg)' }}
          >
            START EXAM SIM
          </button>
        </div>
      </section>
    </div>
  );
}
