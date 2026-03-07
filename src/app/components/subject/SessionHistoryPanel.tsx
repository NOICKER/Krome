import History from "lucide-react/dist/esm/icons/history";
import { HistoryEntry } from "../../types";
import { AnalyticsCard } from "../analytics/AnalyticsCard";
import { HistoryList } from "../HistoryList";

export function SessionHistoryPanel({ entries }: { entries: HistoryEntry[] }) {
  return (
    <AnalyticsCard title="Session History" icon={History} isEmpty={entries.length === 0}>
      <div className="h-full overflow-y-auto pr-1">
        <HistoryList entries={entries.slice(0, 8)} />
      </div>
    </AnalyticsCard>
  );
}
