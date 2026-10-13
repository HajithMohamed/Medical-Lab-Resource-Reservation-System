import * as React from "react";
import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex-1 min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <EmptyState
          icon={FileQuestion}
          title="Page not found"
          description="The requested page could not be found or may have been moved."
          action={
            <Button asChild variant="default">
              <Link href="/calendar">Go to the calendar</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
