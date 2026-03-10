import type { Milestone } from "../types";
import { STORAGE_KEYS, getItem, setItem, subscribeToKey } from "./storageService";

export const getMilestones = (): Milestone[] => {
  return getItem<Milestone[]>(STORAGE_KEYS.MILESTONES, []);
};

export const saveMilestone = (milestone: Milestone): void => {
  setItem(STORAGE_KEYS.MILESTONES, [...getMilestones(), milestone]);
};

export const updateMilestone = (milestone: Milestone): void => {
  const milestones = getMilestones();
  const index = milestones.findIndex((entry) => entry.id === milestone.id);
  if (index === -1) return;

  const nextMilestones = [...milestones];
  nextMilestones[index] = milestone;
  setItem(STORAGE_KEYS.MILESTONES, nextMilestones);
};

export const deleteMilestone = (milestoneId: string): void => {
  setItem(
    STORAGE_KEYS.MILESTONES,
    getMilestones().filter((milestone) => milestone.id !== milestoneId)
  );
};

export const subscribeToMilestones = (listener: (milestones: Milestone[]) => void) => {
  return subscribeToKey<Milestone[]>(STORAGE_KEYS.MILESTONES, (milestones) => {
    listener(milestones ?? []);
  });
};
