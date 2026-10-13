import * as React from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "No access",
};

export default function NoAccessPage() {
  return (
    <div className="flex-1 min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <EmptyState
          icon={ShieldAlert}
          title="You don't have access to this page"
          description="Your laboratory account role does not have permission to view or manage this section."
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
