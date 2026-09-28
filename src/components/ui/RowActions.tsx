import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RowActionsProps {
  label: string;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

const ICON_BUTTON = "rounded-lg p-1.5 text-ink-900/40 transition-colors dark:text-paper-100/40";

/** Edit / delete icon buttons for table rows and cards. */
export function RowActions({ label, onEdit, onDelete, className }: RowActionsProps) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${label}`}
          title="Edit"
          className={cn(ICON_BUTTON, "hover:bg-ink-900/5 hover:text-brand-500 dark:hover:bg-paper-100/10")}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${label}`}
          title="Delete"
          className={cn(ICON_BUTTON, "hover:bg-rose-500/10 hover:text-rose-500")}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
