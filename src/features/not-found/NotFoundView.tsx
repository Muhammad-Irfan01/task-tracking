import { Compass } from "lucide-react";
import { Card, EmptyState, LinkButton } from "@/components/ui";

export function NotFoundView() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="p-8">
        <EmptyState
          icon={Compass}
          title="Page not found"
          description="The page you're looking for doesn't exist or may have moved."
          action={<LinkButton href="/">Back to dashboard</LinkButton>}
        />
      </Card>
    </div>
  );
}
