import { Milestone } from '../types';
import { getItem, setItem } from './storageService';

const MILESTONES_KEY = 'krome_milestones';

export const getMilestones = (): Milestone[] => {
    return getItem<Milestone[]>(MILESTONES_KEY, []);
};

export const saveMilestone = (milestone: Milestone): void => {
    const milestones = getMilestones();
    milestones.push(milestone);
    setItem(MILESTONES_KEY, milestones);
};

export const updateMilestone = (milestone: Milestone): void => {
    const milestones = getMilestones();
    const index = milestones.findIndex(m => m.id === milestone.id);
    if (index !== -1) {
        milestones[index] = milestone;
        setItem(MILESTONES_KEY, milestones);
    }
};

export const deleteMilestone = (milestoneId: string): void => {
    const milestones = getMilestones();
    const updated = milestones.filter(m => m.id !== milestoneId);
    setItem(MILESTONES_KEY, updated);
};
