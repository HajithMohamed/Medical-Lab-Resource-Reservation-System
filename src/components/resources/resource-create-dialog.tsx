"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createResourceAction, type ResourceActionResult } from "@/actions/resources";
import type { Role } from "@/generated/prisma/client";
import { ResourceCoreFields } from "./resource-core-fields";
import { EquipmentFields, type EquipmentFormState } from "./equipment-fields";
import { isValidDay, todayDay } from "@/lib/equipment-dates";

interface ResourceCreateDialogProps {
  actorRole: Role;
  actorSiteId: string | null;
  sites: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; maxBookingMinutes: number; iconKey: string }>;
  sections: Array<{ id: string; name: string }>;
  trigger?: React.ReactNode;
}

const initialEquipmentState: EquipmentFormState = {
  manufacturer: "",
  model: "",
  serialNumber: "",
  inServiceOn: "",
  expectedServiceLifeYears: "",
  replacementReviewDueOn: "",
  needsCalibration: false,
  calibrationIntervalDays: "",
  lastCalibratedOn: "",
  calibratedBy: "",
  calibrationReference: "",
  nextCalibrationDueOn: "",
  needsMaintenance: false,
  maintenanceIntervalDays: "",
  lastServicedOn: "",
  servicedBy: "",
  nextMaintenanceDueOn: "",
};

export function ResourceCreateDialog({
  actorRole,
  actorSiteId,
  sites,
  categories,
  sections,
  trigger,
}: ResourceCreateDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [showOverdueWarning, setShowOverdueWarning] = React.useState(false);

  const isManager = actorRole === "MANAGER";

  const defaultSiteId = isManager && actorSiteId ? actorSiteId : (sites[0]?.id ?? "");
  const defaultCategoryId = categories[0]?.id ?? "";
  const defaultSectionId = sections[0]?.id ?? "";

  const [name, setName] = React.useState("");
  const [siteId, setSiteId] = React.useState(defaultSiteId);
  const [categoryId, setCategoryId] = React.useState(defaultCategoryId);
  const [sectionId, setSectionId] = React.useState(defaultSectionId);
  const [location, setLocation] = React.useState("");
  const [capacity, setCapacity] = React.useState("");
  const [equipment, setEquipment] = React.useState<EquipmentFormState>(initialEquipmentState);

  const resetForm = () => {
    setName("");
    setSiteId(isManager && actorSiteId ? actorSiteId : (sites[0]?.id ?? ""));
    setCategoryId(categories[0]?.id ?? "");
    setSectionId(sections[0]?.id ?? "");
    setLocation("");
    setCapacity("");
    setEquipment(initialEquipmentState);
    setError(null);
    setFieldErrors({});
    setShowOverdueWarning(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const currentSiteName =
    sites.find((s) => s.id === (isManager ? actorSiteId : siteId))?.name ?? "Assigned site";

  const submitForm = async () => {
    setError(null);
    setFieldErrors({});
    setIsPending(true);

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("siteId", isManager && actorSiteId ? actorSiteId : siteId);
    formData.append("categoryId", categoryId);
    formData.append("sectionId", sectionId);
    if (location.trim()) {
      formData.append("location", location.trim());
    }
    if (capacity.trim()) {
      formData.append("capacity", capacity.trim());
    }

    // Equipment fields
    formData.append("manufacturer", equipment.manufacturer.trim());
    formData.append("model", equipment.model.trim());
    formData.append("serialNumber", equipment.serialNumber.trim());
    formData.append("inServiceOn", equipment.inServiceOn);
    formData.append("expectedServiceLifeYears", equipment.expectedServiceLifeYears);
    formData.append("replacementReviewDueOn", equipment.replacementReviewDueOn);

    formData.append("needsCalibration", equipment.needsCalibration ? "true" : "false");
    formData.append("calibrationIntervalDays", equipment.calibrationIntervalDays);
    formData.append("lastCalibratedOn", equipment.lastCalibratedOn);
    formData.append("calibratedBy", equipment.calibratedBy.trim());
    formData.append("calibrationReference", equipment.calibrationReference.trim());
    formData.append("nextCalibrationDueOn", equipment.nextCalibrationDueOn);

    formData.append("needsMaintenance", equipment.needsMaintenance ? "true" : "false");
    formData.append("maintenanceIntervalDays", equipment.maintenanceIntervalDays);
    formData.append("lastServicedOn", equipment.lastServicedOn);
    formData.append("servicedBy", equipment.servicedBy.trim());
    formData.append("nextMaintenanceDueOn", equipment.nextMaintenanceDueOn);

    const result: ResourceActionResult = await createResourceAction(null, formData);
    setIsPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to create resource.");
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      return;
    }

    toast.success(result.message ?? "Resource registered successfully");
    setOpen(false);
    resetForm();
    router.refresh();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const today = todayDay();
    if (
      equipment.needsCalibration &&
      equipment.nextCalibrationDueOn &&
      isValidDay(equipment.nextCalibrationDueOn) &&
      equipment.nextCalibrationDueOn < today
    ) {
      setShowOverdueWarning(true);
      return;
    }
    submitForm();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger ? (
            trigger
          ) : (
            <Button
              variant="default"
              className="gap-2 bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold text-xs font-mono shadow-xs"
            >
              <Plus className="size-4" />
              <span>Add resource</span>
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0 overflow-hidden">
            <DialogHeader className="p-6 pb-4 border-b border-[#1e293b]">
              <DialogTitle>Add resource</DialogTitle>
              <DialogDescription>
                Register an instrument, biosafety cabinet, room or van into the network.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <ResourceCoreFields
                idPrefix="dialog-create"
                name={name}
                setName={setName}
                siteId={siteId}
                setSiteId={setSiteId}
                categoryId={categoryId}
                setCategoryId={setCategoryId}
                sectionId={sectionId}
                setSectionId={setSectionId}
                location={location}
                setLocation={setLocation}
                capacity={capacity}
                setCapacity={setCapacity}
                isManager={isManager}
                actorSiteId={actorSiteId}
                currentSiteName={currentSiteName}
                sites={sites}
                categories={categories}
                sections={sections}
                fieldErrors={fieldErrors}
                disabled={isPending}
              />

              <EquipmentFields
                iconKey={selectedCategory?.iconKey ?? "other"}
                values={equipment}
                onChange={setEquipment}
                fieldErrors={fieldErrors}
                disabled={isPending}
              />
            </div>

            <DialogFooter className="p-4 border-t border-[#1e293b] bg-[#141c2b] flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold"
              >
                {isPending ? "Adding..." : "Add resource"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showOverdueWarning} onOpenChange={setShowOverdueWarning}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Calibration is overdue</AlertDialogTitle>
            <AlertDialogDescription>
              The calibration is overdue. Nobody can book this instrument until a calibration is
              recorded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowOverdueWarning(false)}>
              Go back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowOverdueWarning(false);
                submitForm();
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              Save anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
