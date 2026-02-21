import { Task } from '../types';
import { getItem, setItem } from './storageService';

const TASKS_KEY = 'krome_tasks';

export const getTasks = (): Task[] => {
    return getItem<Task[]>(TASKS_KEY, []);
};

export const saveTask = (task: Task): void => {
    const tasks = getTasks();
    tasks.push(task);
    setItem(TASKS_KEY, tasks);
};

export const updateTask = (task: Task): void => {
    const tasks = getTasks();
    const index = tasks.findIndex(t => t.id === task.id);
    if (index !== -1) {
        tasks[index] = task; // ← was missing: actually replace the task in the array
        setItem(TASKS_KEY, tasks);
    }
};

export const deleteTask = (taskId: string): void => {
    const tasks = getTasks();
    const updated = tasks.filter(t => t.id !== taskId);
    setItem(TASKS_KEY, updated);
};
