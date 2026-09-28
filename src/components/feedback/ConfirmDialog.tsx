"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useConfirmStore } from "@/store/confirm.store";

export function ConfirmDialog() {
  const request = useConfirmStore((state) => state.request);
  const settle = useConfirmStore((state) => state.settle);
  const danger = request?.tone !== "primary";

  return (
    <Modal
      open={!!request}
      onClose={() => settle(false)}
      title={request?.title ?? ""}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => settle(false)}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={() => settle(true)} data-autofocus>
            {request?.confirmLabel ?? "Confirm"}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {danger && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
            <TriangleAlert className="h-4.5 w-4.5" />
          </span>
        )}
        <p className="text-sm leading-relaxed text-ink-900/70 dark:text-paper-100/70">{request?.description}</p>
      </div>
    </Modal>
  );
}
