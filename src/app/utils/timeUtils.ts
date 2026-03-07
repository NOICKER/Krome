export function getTimeOfDay(timestamp: number): "morning" | "afternoon" | "evening" | "night" {
  const hour = new Date(timestamp).getHours();

  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}
