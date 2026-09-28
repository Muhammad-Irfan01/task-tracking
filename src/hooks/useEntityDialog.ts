import { useState } from "react";
import { errorMessage } from "@/services/api-client";
import { confirm } from "@/store/confirm.store";
import { toast } from "@/store/toast.store";

/** Tracks which entity (or a new one) an edit dialog is open for. */
export function useEntityDialog<T>() {
  // The target outlives `open` so the dialog keeps its content during the exit animation.
  const [state, setState] = useState<{ target: T | "new"; open: boolean; nonce: number }>({
    target: "new",
    open: false,
    nonce: 0,
  });
  return {
    open: state.open,
    editing: state.target === "new" ? null : state.target,
    /** Changes on every open so the form remounts with fresh values. */
    key: state.nonce,
    openCreate: () => setState((s) => ({ target: "new", open: true, nonce: s.nonce + 1 })),
    openEdit: (item: T) => setState((s) => ({ target: item, open: true, nonce: s.nonce + 1 })),
    close: () => setState((s) => ({ ...s, open: false })),
  };
}

/** Confirms, deletes, and reports the outcome — the server explains blocked deletes. */
export async function confirmDelete(label: string, name: string, remove: () => Promise<void>) {
  const ok = await confirm({
    title: `Delete ${label}?`,
    description: `“${name}” will be permanently removed. This can't be undone.`,
    confirmLabel: "Delete",
    tone: "danger",
  });
  if (!ok) return false;
  try {
    await remove();
    toast.success(`${label[0].toUpperCase()}${label.slice(1)} deleted`);
    return true;
  } catch (error) {
    toast.error(errorMessage(error));
    return false;
  }
}
