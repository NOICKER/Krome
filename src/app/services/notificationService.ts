import { format, getDay, getHours } from "date-fns";
import { toast } from "sonner";
import { KromeDay, KromeWeek, NotificationEntry, WeeklyPlan } from "../types";

interface NotificationContext {
  day: KromeDay;
  week: KromeWeek;
  weeklyPlan: WeeklyPlan | null;
  existing: NotificationEntry[];
  now?: Date;
}

function hasNotification(existing: NotificationEntry[], id: string) {
  return existing.some((entry) => entry.id === id);
}

function appendIfMissing(next: NotificationEntry[], existing: NotificationEntry[], entry: NotificationEntry) {
  if (hasNotification(existing, entry.id) || next.some((current) => current.id === entry.id)) {
    return;
  }

  next.push(entry);
}

export function evaluateNotifications({
  day,
  week,
  weeklyPlan,
  existing,
  now = new Date(),
}: NotificationContext): NotificationEntry[] {
  const next: NotificationEntry[] = [];
  const dateISO = format(now, "yyyy-MM-dd");
  const hour = getHours(now);
  const weekDay = getDay(now);

  if (hour >= 20 && day.goalProgress.current === 0) {
    appendIfMissing(next, existing, {
      id: `day-reminder-${dateISO}`,
      message: "Still time to protect today's study.",
      type: "reminder",
      timestamp: now.getTime(),
      read: false,
    });
  }

  if (weekDay === 1 && hour < 12) {
    appendIfMissing(next, existing, {
      id: `weekly-reflection-${week.weekStartDate}`,
      message: "Weekly reflection reminder.",
      type: "reflection",
      timestamp: now.getTime(),
      read: false,
    });
  }

  if (!weeklyPlan && weekDay >= 1 && weekDay <= 3 && hour >= 9) {
    appendIfMissing(next, existing, {
      id: `plan-missing-${week.weekStartDate}`,
      message: "Set this week's plan before the allocation drifts.",
      type: "warning",
      timestamp: now.getTime(),
      read: false,
    });
  }

  return next;
}

export function emitNotification(entry: NotificationEntry, enabled: boolean) {
  if (!enabled) return;

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Krome", {
      body: entry.message,
      icon: "/favicon.ico",
    });
    return;
  }

  toast(entry.message, {
    duration: 5000,
    className: "bg-slate-900 border-slate-800 text-slate-200",
  });
}
