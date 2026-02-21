import { Subject } from '../types';
import { getItem, setItem } from './storageService';

const SUBJECTS_KEY = 'krome_subjects';

export const getSubjects = (): Subject[] => {
    return getItem<Subject[]>(SUBJECTS_KEY, [{ id: 'default', name: 'General', createdAt: Date.now() }]);
};

export const saveSubject = (subject: Subject): void => {
    const subjects = getSubjects();
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
