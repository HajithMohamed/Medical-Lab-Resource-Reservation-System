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
      <div className="rounded-xl border border-[#334155] bg-[#141c2b] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#334155]/60 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Bell className="size-4 text-[#6cd8cb]" />
              In-App Notification Channels
            </h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Choose which events trigger real-time toasts and appear in your notification feed.
            </p>
          </div>
        </div>

        <div className="divide-y divide-[#334155]/50">
          {preferences.map((item) => {
            const isMandatory = !item.canTurnOffInApp;
            const isUpdating = updatingKind === item.kind;

            return (
              <div
                key={item.kind}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#182234] transition-colors"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">{item.label}</span>
                    {isMandatory && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        <Lock className="size-2.5" />
                        Mandatory
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">{item.description}</p>
                  {isMandatory && (
                    <p className="text-[11px] text-[#64748b] italic">
                      This alert cannot be disabled to prevent missed lab schedule disruptions.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#94a3b8]">
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
