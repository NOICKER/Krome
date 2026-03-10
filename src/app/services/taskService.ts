import type { Task } from "../types";
import { STORAGE_KEYS, getItem, setItem, subscribeToKey } from "./storageService";

export const getTasks = (): Task[] => {
  return getItem<Task[]>(STORAGE_KEYS.TASKS, []);
};

export const saveTask = (task: Task): void => {
  setItem(STORAGE_KEYS.TASKS, [...getTasks(), task]);
};

export const updateTask = (task: Task): void => {
  const tasks = getTasks();
  const index = tasks.findIndex((entry) => entry.id === task.id);
  if (index === -1) return;

  const nextTasks = [...tasks];
  nextTasks[index] = task;
  setItem(STORAGE_KEYS.TASKS, nextTasks);
};

export const deleteTask = (taskId: string): void => {
  setItem(
    STORAGE_KEYS.TASKS,
    getTasks().filter((task) => task.id !== taskId)
  );
};

export const subscribeToTasks = (listener: (tasks: Task[]) => void) => {
  return subscribeToKey<Task[]>(STORAGE_KEYS.TASKS, (tasks) => {
    listener(tasks ?? []);
  });
};
