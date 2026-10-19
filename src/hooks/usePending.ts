import { useState } from "react";

/** Tracks in-flight actions by key, so only the button (or row) that triggered one shows a spinner. */
export function usePending<K = string>() {
  const [keys, setKeys] = useState<ReadonlySet<K>>(() => new Set());

  async function run(key: K, action: () => Promise<void>) {
    setKeys((current) => new Set(current).add(key));
    try {
      await action();
    } finally {
      setKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }

  return { isPending: (key: K) => keys.has(key), run };
}
