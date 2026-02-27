import { Subject } from '../types';
import { getItem, setItem } from './storageService';
import { assignSubjectColor } from '../utils/subjectUtils';

const SUBJECTS_KEY = 'krome_subjects';

const DEFAULT_SUBJECT: Subject = {
    id: 'general',
    name: 'General',
    createdAt: Date.now(),
    color: '#62699D',
};

export const getSubjects = (): Subject[] => {
    const stored = getItem<Subject[]>(SUBJECTS_KEY, [DEFAULT_SUBJECT]);
    // Ensure the general subject always exists and has a color
    const hasGeneral = stored.some(s => s.id === 'general' || s.id === 'default');
    if (!hasGeneral) stored.unshift(DEFAULT_SUBJECT);
    // Backfill colors for any old subjects missing them
    const existingColors = stored.filter(s => s.color).map(s => s.color!);
    let changed = false;
    for (const s of stored) {
        if (!s.color) {
            s.color = assignSubjectColor(existingColors);
            existingColors.push(s.color);
            changed = true;
        }
    }
    if (changed) setItem(SUBJECTS_KEY, stored);
    return stored;
};

export const saveSubject = (subject: Subject): void => {
    const subjects = getSubjects();
    // Auto-assign a color if the subject doesn't have one
    if (!subject.color) {
        const existingColors = subjects.filter(s => s.color).map(s => s.color!);
        subject = { ...subject, color: assignSubjectColor(existingColors) };
    }
    const existingIndex = subjects.findIndex(s => s.id === subject.id);
    if (existingIndex >= 0) {
        subjects[existingIndex] = subject;
    } else {
        subjects.push(subject);
    }
    setItem(SUBJECTS_KEY, subjects);
};

export const saveSubjects = (subjects: Subject[]): void => {
    setItem(SUBJECTS_KEY, subjects);
};

export const deleteSubject = (id: string): void => {
    const subjects = getSubjects();
    setItem(SUBJECTS_KEY, subjects.filter(s => s.id !== id));
};
