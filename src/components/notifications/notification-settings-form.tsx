"use client";

import * as React from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Lock, Bell } from "lucide-react";
import { updatePreferenceAction } from "@/actions/notifications";
import type { UserNotificationPreferenceItem } from "@/services/notifications";

export interface NotificationSettingsFormProps {
  initialPreferences: UserNotificationPreferenceItem[];
}

export function NotificationSettingsForm({ initialPreferences }: NotificationSettingsFormProps) {
  const [preferences, setPreferences] = React.useState(initialPreferences);
  const [updatingKind, setUpdatingKind] = React.useState<string | null>(null);

  const handleToggle = async (item: UserNotificationPreferenceItem, nextValue: boolean) => {
    if (!item.canTurnOffInApp) return;

    setUpdatingKind(item.kind);
    // Optimistic update
    setPreferences((prev) =>
      prev.map((p) => (p.kind === item.kind ? { ...p, inApp: nextValue } : p)),
    );

    try {
      const res = await updatePreferenceAction(item.kind, nextValue, false);
      if (!res.ok) {
        // Revert
        setPreferences((prev) =>
          prev.map((p) => (p.kind === item.kind ? { ...p, inApp: item.inApp } : p)),
        );
        toast.error(res.error ?? "Failed to update preference.");
      } else {
        toast.success("Preference updated.");
      }
    } catch {
      // Revert
      setPreferences((prev) =>
        prev.map((p) => (p.kind === item.kind ? { ...p, inApp: item.inApp } : p)),
      );
      toast.error("Failed to update preference.");
    } finally {
      setUpdatingKind(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="rounded-2xl border border-card-edge bg-card shadow-v4 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-card-edge bg-canvas/60 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-navy flex items-center gap-2">
              <Bell className="size-4 text-teal" />
              In-App Notification Channels
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Choose which events trigger real-time toasts and appear in your notification feed.
            </p>
          </div>
        </div>

        <div className="divide-y divide-line">
          {preferences.map((item) => {
            const isMandatory = !item.canTurnOffInApp;
            const isUpdating = updatingKind === item.kind;

            return (
              <div
                key={item.kind}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-mint/30 transition-colors"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-navy">{item.label}</span>
                    {isMandatory && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-soft text-amber border border-amber-line">
                        <Lock className="size-2.5" />
                        Mandatory
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted leading-relaxed font-normal">
                    {item.description}
                  </p>
                  {isMandatory && (
                    <p className="text-[11px] text-faint italic font-normal">
                      This alert cannot be disabled to prevent missed lab schedule disruptions.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-muted">
                      {item.inApp ? "Enabled" : "Disabled"}
                    </span>
                    <Switch
                      id={`pref-${item.kind}`}
                      checked={item.inApp}
                      disabled={isMandatory || isUpdating}
                      onCheckedChange={(checked) => handleToggle(item, checked)}
                      aria-label={`Toggle notifications for ${item.label}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
