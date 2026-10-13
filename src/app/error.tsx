"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  reset,
  retry,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  retry?: () => void;
}) {
  const handleRetry = () => {
    if (typeof retry === "function") {
      retry();
    } else {
      reset();
    }
  };

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <EmptyState
          icon={AlertTriangle}
          title="Something went wrong"
          description="An unexpected error occurred while processing your request. Please try again or return to the calendar."
          action={
            <div className="flex items-center gap-3">
              <Button onClick={handleRetry} variant="default">
                Try again
              </Button>
              <Button asChild variant="secondary">
                <Link href="/calendar">Go to calendar</Link>
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
}
