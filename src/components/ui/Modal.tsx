"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useEffectEvent, useId, useRef, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/hooks/useIsClient";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const WIDTHS = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };

export function Modal({ open, onClose, title, description, children, footer, size = "md" }: ModalProps) {
  const isClient = useIsClient();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // Stable handler so re-renders (e.g. typing) don't re-run the focus effect.
  const onEscape = useEffectEvent(() => onClose());

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onEscape();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Focus the first field, falling back to the panel itself.
    requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector<HTMLElement>("input, select, textarea, [data-autofocus]");
      (target ?? panelRef.current)?.focus();
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previousFocus?.focus?.();
    };
  }, [open]);

  if (!isClient) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
            className={cn(
              "surface relative flex max-h-[90vh] w-full flex-col rounded-t-2xl shadow-card outline-hidden sm:rounded-2xl",
              WIDTHS[size],
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-ink-900/[0.06] px-5 py-4 dark:border-paper-100/[0.06]">
              <div>
                <h2 id={titleId} className="font-display text-lg font-semibold text-ink-900 dark:text-paper-100">
                  {title}
                </h2>
                {description && <p className="mt-0.5 text-sm text-ink-900/50 dark:text-paper-100/50">{description}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="-mr-1 rounded-lg p-1.5 text-ink-900/40 hover:bg-ink-900/5 hover:text-ink-900 dark:text-paper-100/40 dark:hover:bg-paper-100/10 dark:hover:text-paper-100"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-5">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-3 border-t border-ink-900/[0.06] px-5 py-4 dark:border-paper-100/[0.06]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

interface FormModalProps extends Omit<ModalProps, "footer"> {
  onSubmit: (event: FormEvent) => void;
  submitting?: boolean;
  submitLabel?: string;
}

/** Modal wrapping a form with Cancel / Submit actions. */
export function FormModal({ onSubmit, submitting, submitLabel = "Save", children, ...modal }: FormModalProps) {
  const formId = useId();
  return (
    <Modal
      {...modal}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={modal.onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={submitting}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} noValidate className="space-y-4">
        {children}
      </form>
    </Modal>
  );
}
