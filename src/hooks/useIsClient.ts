import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False during SSR and hydration, true afterwards — for browser-only values like the clock. */
export function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
