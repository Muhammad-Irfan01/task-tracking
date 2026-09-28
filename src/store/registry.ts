/**
 * Stores register a refresher here. After any mutation we refetch every store
 * that has already loaded, so computed values (counts, SLA status, reports)
 * stay consistent across the app without manual cache wiring.
 */
type Refresher = () => void;

const refreshers = new Map<string, Refresher>();

export function registerStore(key: string, refresh: Refresher) {
  refreshers.set(key, refresh);
}

export function refreshLoadedStores(except?: string) {
  for (const [key, refresh] of refreshers) {
    if (key !== except) refresh();
  }
}
