export const SYNC_REQUEST_EVENT = "krome:sync-request";

export function dispatchSyncRequest() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SYNC_REQUEST_EVENT));
}
