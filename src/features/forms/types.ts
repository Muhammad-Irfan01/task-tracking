export interface EntityFormProps<T> {
  open: boolean;
  /** The record being edited, or null to create a new one. */
  entity: T | null;
  onClose: () => void;
  onSaved?: (saved: T) => void;
}
