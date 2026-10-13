"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/confirm-action";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function StyleguideClientDemos() {
  const [pending, setPending] = React.useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="default"
        onClick={() => {
          setPending(true);
          setTimeout(() => setPending(false), 2000);
        }}
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin mr-1.5" />
            Saving...
          </>
        ) : (
          "Test pending state"
        )}
      </Button>

      <Button
        variant="secondary"
        onClick={() => toast.success("Booking confirmed: Real-time PCR machine 1, 10:00 to 12:00")}
      >
        Trigger toast
      </Button>

      <ConfirmAction
        title="Cancel booking?"
        description="Are you sure you want to cancel this booking? This will free the slot for other staff members."
        confirmLabel="Yes, cancel booking"
        isDestructive
        trigger={<Button variant="destructive">Open confirm dialog</Button>}
        action={async () => {
          toast.info("Booking cancelled successfully.");
        }}
      />
    </div>
  );
}
