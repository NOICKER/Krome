import { HistoryEntry } from '../types';
import { getHistory } from './storageService';
import { getTasks } from './taskService';
import { getMilestones } from './milestoneService';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, subDays, differenceInCalendarDays } from 'date-fns';

export interface DailySummary {
    totalClaimedTime: number; // minutes
    blocksCompleted: number;
    abandonedSessions: number;
}

export interface CategoryBreakdown {
    study: number;
    reset: number;
    distraction: number;
    away: number;
    total: number;
}

export function getTodaySummary(todayISO: string): DailySummary {
    const history = getHistory();
    const todayHistory = history.filter(h => h.dateISO === todayISO);

    let totalClaimedTimeMs = 0;
    let blocksCompleted = 0;
    let abandonedSessions = 0;

    todayHistory.forEach(entry => {
        if (entry.completed) {
            blocksCompleted += 1;
            totalClaimedTimeMs += entry.durationMs;
        } else {
            abandonedSessions += 1;
        }
    });

    return {
        totalClaimedTime: Math.floor(totalClaimedTimeMs / 60000),
        blocksCompleted,
        abandonedSessions
    };
}

export function getHeatmapData(year: number, month: number) {
    const history = getHistory();
    const start = new Date(year, month, 1);
    const end = endOfMonth(start);
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
        const dayISO = format(day, 'yyyy-MM-dd');
        const dayLog = history.filter(h => h.dateISO === dayISO);

        // Status resolution based on conditions
        let status: 'none' | 'retained' | 'spilled' | 'mixed' | 'observed' = 'none';

        if (dayLog.length > 0) {
            const hasSpill = dayLog.some(h => h.potSpilled || h.potResult === 'spilled');
            const hasRetained = dayLog.some(h => (!h.potSpilled && h.potResult === 'retained'));

            // Basic heuristics matching the brief
            if (hasSpill && hasRetained) status = 'mixed';
            else if (hasSpill) status = 'spilled';
            else if (hasRetained) status = 'retained';
            else status = 'observed'; // default or standard sessions
        }

        // Format pot result for display
        let potResultStr = "None";
        if (status === 'spilled') potResultStr = "Spilled";
        else if (status === 'retained') potResultStr = "Retained";
        else if (status === 'mixed') potResultStr = "Mixed";
        else if (status === 'observed') potResultStr = "Observed";

        return {
            date: dayISO,
            status,
            sessionCount: dayLog.length,
            blocks: dayLog.filter(h => h.completed).length,
            abandonedCount: dayLog.filter(h => !h.completed).length,
            potResult: potResultStr
        };
    });
}

export function getAdvancedObservations(): string[] {
    const history = getHistory();
    if (history.length === 0) return ["No sessions recorded yet."];

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recent = history.filter(h => h.startedAt >= thirtyDaysAgo);

    if (recent.length < 5) return ["Monitoring session patterns."];

    const insights: { text: string; weight: number }[] = [];

    // 1. Time of Day Pattern
    const completedRecent = recent.filter(h => h.completed);
    if (completedRecent.length > 5) {
        let morning = 0, afternoon = 0, evening = 0, night = 0;
        completedRecent.forEach(h => {
            const hour = new Date(h.startedAt).getHours();
            if (hour >= 5 && hour < 12) morning++;
            else if (hour >= 12 && hour < 17) afternoon++;
            else if (hour >= 17 && hour < 22) evening++;
            else night++;
        });
        const total = completedRecent.length;
        if (evening / total > 0.6) insights.push({ text: "Most sessions occur in the evening.", weight: 1 });
        else if (morning / total > 0.6) insights.push({ text: "Most sessions occur in the morning.", weight: 1 });
        else if (afternoon / total > 0.6) insights.push({ text: "Most sessions occur in the afternoon.", weight: 1 });
        else if (night / total > 0.6) insights.push({ text: "Most sessions occur late at night.", weight: 1 });
    }

    // 2. Duration Risk Pattern
    const longSessions = recent.filter(h => h.durationMs > 45 * 60000);
    if (longSessions.length >= 3) {
        const longSpills = longSessions.filter(h => h.potSpilled || h.potResult === 'spilled').length;
        const overallSpills = recent.filter(h => h.potSpilled || h.potResult === 'spilled').length;
        const longSpillRate = longSpills / longSessions.length;
        const overallSpillRate = recent.length > 0 ? (overallSpills / recent.length) : 0;

        if (longSpillRate > 0.4 && longSpillRate > overallSpillRate * 1.5) {
            insights.push({ text: "Long sessions spill more frequently.", weight: 4 }); // High Risk
        }
    }

    // 3. Weekend Behavior
    const weekendSessions = recent.filter(h => {
        const day = new Date(h.startedAt).getDay();
        return day === 0 || day === 6;
    });
    const weekdaySessions = recent.length - weekendSessions.length;

    if (recent.length > 10) {
        const weekendSpills = weekendSessions.filter(h => h.potSpilled || h.potResult === 'spilled').length;
        const weekdaySpills = recent.filter(h => h.potSpilled || h.potResult === 'spilled').length - weekendSpills;

        const weekendSpillRate = weekendSessions.length > 0 ? weekendSpills / weekendSessions.length : 0;
        const weekdaySpillRate = weekdaySessions > 0 ? weekdaySpills / weekdaySessions : 0;

        if (weekendSpillRate > 0.3 && weekendSpillRate > weekdaySpillRate * 1.5) {
            insights.push({ text: "Pot spills spike on weekends.", weight: 3 }); // Risk
        } else if (weekendSessions.length > weekdaySessions * 1.5) {
            insights.push({ text: "Observed sessions spike on weekends.", weight: 2 }); // Behavioral
        }
    }

    // 4. Subject Neglect
    const subjectsMap = new Map<string, number>();
    history.filter(h => h.completed && h.subject).forEach(h => {
        const existing = subjectsMap.get(h.subject) || 0;
        if (h.startedAt > existing) subjectsMap.set(h.subject, h.startedAt);
    });

    subjectsMap.forEach((lastSeen, subject) => {
        const daysSince = differenceInCalendarDays(new Date(), new Date(lastSeen));
        if (daysSince >= 5 && daysSince <= 14) {
            insights.push({ text: `${subject} has not been claimed in ${daysSince} days.`, weight: 3 }); // Neglect
        }
    });

    // 5. Abandon Trigger
    const abandoned = recent.filter(h => !h.completed);
    if (abandoned.length >= 3) {
        const quickAbandons = abandoned.filter(h => h.durationMs < 15 * 60000).length;
        if (quickAbandons / abandoned.length > 0.6) {
            insights.push({ text: "Abandoned sessions often end before 15 minutes.", weight: 2 }); // Behavioral
        }
    }

    // Fallback if no patterns
    if (insights.length === 0) {
        return ["Monitoring session patterns."];
    }

    // Sort by weight descending, take top 3, extract text
    return insights
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 3)
        .map(i => i.text);
}

// Phase 3 Analytics

export function getSubjectDistribution() {
    const history = getHistory();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recent = history.filter(h => h.completed && h.startedAt >= thirtyDaysAgo);

    const dist: Record<string, number> = {};
    recent.forEach(h => {
        const sub = h.subject || 'Uncategorized';
        dist[sub] = (dist[sub] || 0) + (h.durationMs / 60000);
    });

    return Object.entries(dist)
        .map(([subject, minutes]) => ({ subject, minutes: Math.round(minutes) }))
        .sort((a, b) => b.minutes - a.minutes);
}

export function getCategoryDistribution(): CategoryBreakdown {
    const history = getHistory();
    const brk: CategoryBreakdown = { study: 0, reset: 0, distraction: 0, away: 0, total: 0 };

    // In Krome, we only have intent strings for now. We will map intents to these buckets roughly.
    // If strictMode is true, the user should be filing these accurately.
    history.filter(h => h.completed).forEach(h => {
        const intent = h.intent.toLowerCase();
        brk.total++;
        if (intent.includes('break') || intent.includes('reset')) brk.reset++;
        else if (intent.includes('distract') || intent.includes('scroll') || intent.includes('youtube')) brk.distraction++;
        else if (intent.includes('away') || intent.includes('lunch') || intent.includes('walk')) brk.away++;
        else brk.study++; // Default to study
    });

    return brk;
}

export function getPotTrend() {
    const history = getHistory();

    // We want the last 14 days
    const end = new Date();
    const start = subDays(end, 13);
    const days = eachDayOfInterval({ start, end });

    // Since KromeDay manages the pot, and we only have sessions in history,
    // we approximate the daily pot trend by summing retained minus spilled sessions for the chart's visual.
    // Real potvalue lives in KromeDay but isn't snapshotted per day in storage yet.

    let cumulativePot = 0;

    return days.map(day => {
        const dayISO = format(day, 'yyyy-MM-dd');
        const dayLog = history.filter(h => h.dateISO === dayISO);

        let spilledToday = false;

        dayLog.forEach(h => {
            if (h.potResult === 'retained') cumulativePot += 10;
            if (h.potResult === 'spilled' || h.potSpilled) {
                cumulativePot = Math.max(0, cumulativePot - 20); // Penalty
                spilledToday = true;
            }
        });

        return {
            date: format(day, 'MMM dd'),
            potValue: cumulativePot,
            spilled: spilledToday
        };
    });
}

export function getStreakTrend() {
    const history = getHistory();
    const end = new Date();
    const start = subDays(end, 13);
    const days = eachDayOfInterval({ start, end });

    let currentApproxStreak = 0;

    return days.map(day => {
        const dayISO = format(day, 'yyyy-MM-dd');
        const hasCompletedSessions = history.some(h => h.dateISO === dayISO && h.completed);

        if (hasCompletedSessions) {
            currentApproxStreak++;
        } else {
            currentApproxStreak = 0;
        }

        return { date: format(day, 'MMM dd'), streak: currentApproxStreak };
    });
}

export function getSessionDurationDistribution() {
    const history = getHistory();
    const buckets = {
        '0-15m': 0,
        '15-30m': 0,
        '30-60m': 0,
        '60m+': 0
    };

    history.filter(h => h.completed).forEach(h => {
        const mins = h.durationMs / 60000;
        if (mins <= 15) buckets['0-15m']++;
        else if (mins <= 30) buckets['15-30m']++;
        else if (mins <= 60) buckets['30-60m']++;
        else buckets['60m+']++;
    });

    return Object.entries(buckets).map(([name, count]) => ({ name, count }));
}

export function getAbandonFrequency() {
    const history = getHistory();
    const end = new Date();
    const start = subDays(end, 6); // Last 7 days
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
        const dayISO = format(day, 'yyyy-MM-dd');
        const dayLog = history.filter(h => h.dateISO === dayISO);

        const completed = dayLog.filter(h => h.completed).length;
        const abandoned = dayLog.filter(h => !h.completed).length;

        return {
            date: format(day, 'EEE'), // Mon, Tue
            completed,
            abandoned
        };
    });
}

export function getTaskCompletionStats() {
    const tasks = getTasks();
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;

    let totalBlocks = 0;
    tasks.forEach(t => totalBlocks += t.completedBlocks);
    const avgBlocks = total > 0 ? (totalBlocks / total).toFixed(1) : "0";

    return { total, completed, avgBlocks };
}

// Phase 5: Milestone Analytics
export function getDaysRemaining(targetDateMs: number): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDateMs);
    target.setHours(0, 0, 0, 0);
    return differenceInCalendarDays(target, today);
}

export function getMilestoneProximity() {
    const milestones = getMilestones();
    if (milestones.length === 0) return null;

    // Use the earliest future milestone, or the most recent past one if none in future
    const sorted = [...milestones].sort((a, b) => a.targetDate - b.targetDate);
    const active = sorted.find(m => getDaysRemaining(m.targetDate) >= 0) || sorted[0];

    const daysRemaining = getDaysRemaining(active.targetDate);
    const totalDaysSinceCreation = differenceInCalendarDays(new Date(active.targetDate), new Date(active.createdAt || Date.now()));

    // Protect against division by zero
    let percentageProgress = 0;
    if (totalDaysSinceCreation > 0 && daysRemaining >= 0) {
        const daysPassed = totalDaysSinceCreation - daysRemaining;
        percentageProgress = Math.min(100, Math.max(0, (daysPassed / totalDaysSinceCreation) * 100));
    } else if (daysRemaining < 0) {
        percentageProgress = 100;
    }

    return {
        id: active.id,
        title: active.title,
        daysRemaining,
        totalDaysSinceCreation,
        percentageProgress
    };
}
