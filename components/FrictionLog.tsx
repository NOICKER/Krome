import React, { useMemo, useState } from 'react';
import { FrictionEntry } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { AlertCircle, FileText, Copy, Check } from 'lucide-react';

interface FrictionLogProps {
  entries: FrictionEntry[];
}

export const FrictionLog: React.FC<FrictionLogProps> = ({ entries }) => {
  const [copied, setCopied] = useState(false);

  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach(e => {
      counts[e.reason] = (counts[e.reason] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [entries]);

  const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#64748b'];

  const handleExport = () => {
    const text = entries
      .slice()
      .reverse()
      .map(e => {
        // Format: 2026-02-19 17:03 - Confused / Stuck - "no solved example" - abandoned 3/6
        const d = new Date(e.date);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        
        return `${dateStr} - ${e.reason}${e.note ? ` - "${e.note}"` : ''} - abandoned ${e.bricksLost || '?'}`;
      })
      .join('\n');
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500 dark:text-slate-400">
        <p>No friction logged yet.</p>
        <p className="text-sm mt-2">Abandoning a session will ask you to log a reason here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button 
          onClick={handleExport}
          className="flex items-center space-x-1 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
        >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Export Friction Log'}</span>
        </button>
      </div>

      {/* Insight Chart */}
      <div className="h-64 w-full">
        <h3 className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider text-center">Friction Sources</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
              ))}
            </Pie>
            <RechartsTooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Log List */}
      <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
        {entries.slice().reverse().map((entry) => (
          <div key={entry.id} className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg flex items-start space-x-3 border border-slate-100 dark:border-slate-700">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{entry.reason}</p>
                <span className="text-xs text-slate-400">{new Date(entry.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between mt-1 text-xs text-slate-500 dark:text-slate-400">
                 {entry.note ? (
                    <div className="flex items-center flex-1 mr-2">
                      <FileText className="w-3 h-3 mr-1" />
                      <p className="truncate">{entry.note}</p>
                    </div>
                 ) : <span></span>}
                 {entry.bricksLost && (
                     <span className="text-slate-400">{entry.bricksLost} bricks</span>
                 )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};