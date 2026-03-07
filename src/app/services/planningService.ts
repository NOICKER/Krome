import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import { WeeklyPlan } from "../types";
import { getCurrentWeekBounds } from "../utils/dateUtils";
import { getItem, setItem, STORAGE_KEYS } from "./storageService";

export function getWeeklyPlans(): WeeklyPlan[] {
  return getItem<WeeklyPlan[]>(STORAGE_KEYS.WEEKLY_PLANS, []);
}

export function getCurrentWeekPlan(date = new Date()): WeeklyPlan | null {
  const weekStartDate = format(getCurrentWeekBounds(date).start, "yyyy-MM-dd");
  return getWeeklyPlans().find((plan) => plan.weekStartDate === weekStartDate) ?? null;
}

export function saveWeeklyPlan(plan: Omit<WeeklyPlan, "id"> & { id?: string }): WeeklyPlan {
  const plans = getWeeklyPlans();
  const nextPlan: WeeklyPlan = {
    id: plan.id ?? uuidv4(),
    weekStartDate: plan.weekStartDate,
    allocations: plan.allocations,
    strategyNotes: plan.strategyNotes,
  };
  const existingIndex = plans.findIndex((entry) => entry.weekStartDate === plan.weekStartDate);
  const nextPlans =
    existingIndex >= 0
      ? plans.map((entry, index) => (index === existingIndex ? nextPlan : entry))
      : [nextPlan, ...plans];

  setItem(STORAGE_KEYS.WEEKLY_PLANS, nextPlans);
  return nextPlan;
}
