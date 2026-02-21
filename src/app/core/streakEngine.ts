import { format, isSameDay, subDays } from 'date-fns';
import { KromeStreak } from '../types';

export function validateStreak(streak: KromeStreak, today: string): KromeStreak {
    const yesterday = format(subDays(new Date(today), 1), 'yyyy-MM-dd');

    if (streak.lastCompletedDate !== today && streak.lastCompletedDate !== yesterday) {
        if (streak.lastCompletedDate !== null) {
            return { ...streak, current: 0 };
        }
    }
    return streak;
}

export function incrementStreak(streak: KromeStreak, today: string): KromeStreak {
    if (streak.lastCompletedDate === today) {
        return streak; // Already secured today
    }
    return {
        current: streak.current + 1,
        lastCompletedDate: today
    };
}
