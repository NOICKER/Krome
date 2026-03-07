import { GoalProgress } from "../types";

const DEFAULT_BLOCK_GOAL: GoalProgress = {
  type: "blocks",
  target: 0,
  current: 0,
};

export function normalizeGoalProgress(goal: GoalProgress | number | undefined, fallback: GoalProgress = DEFAULT_BLOCK_GOAL): GoalProgress {
  if (typeof goal === "number") {
    return {
      type: "blocks",
      target: goal,
      current: 0,
    };
  }

  return {
    type: goal?.type ?? fallback.type,
    target: goal?.target ?? fallback.target,
    current: goal?.current ?? fallback.current,
  };
}

export function withGoalCurrent(goal: GoalProgress | number | undefined, current: number, fallback: GoalProgress = DEFAULT_BLOCK_GOAL): GoalProgress {
  const normalized = normalizeGoalProgress(goal, fallback);
  return {
    ...normalized,
    current,
  };
}

export function getGoalMetricValue(goal: GoalProgress, metrics: { blocks: number; minutes: number }) {
  return goal.type === "minutes" ? metrics.minutes : metrics.blocks;
}

export function getGoalUnitLabel(goalType: GoalProgress["type"]) {
  return goalType === "minutes" ? "min" : "blocks";
}

export function getGoalProgressPercent(goal: GoalProgress) {
  if (goal.target <= 0) return 0;
  return Math.min(100, Math.round((goal.current / goal.target) * 100));
}
