import { CloudOff } from "lucide-react";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

interface ErrorStateProps {
  message?: string | null;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <EmptyState
      icon={CloudOff}
      title="Couldn't load this data"
      description={message ?? "Please check your connection and try again."}
      action={
        onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    />
  );
}
