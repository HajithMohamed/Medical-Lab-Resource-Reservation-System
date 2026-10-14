"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
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
import { updateResourceAction, type ResourceActionResult } from "@/actions/resources";
import type { Role } from "@/generated/prisma/client";
import { ResourceCoreFields } from "./resource-core-fields";
import { EquipmentFields, type EquipmentFormState } from "./equipment-fields";
import { dbToDay, isValidDay, todayDay } from "@/lib/equipment-dates";

interface ResourceEditDialogProps {
  resource: {
    id: string;
    name: string;
    siteId: string;
    categoryId: string;
    sectionId: string;
    location: string | null;
    capacity: number | null;
    manufacturer?: string | null;
    model?: string | null;
    serialNumber?: string | null;
    inServiceOn?: Date | string | null;
    expectedServiceLifeYears?: number | null;
    replacementReviewDueOn?: Date | string | null;
    calibrationIntervalDays?: number | null;
    nextCalibrationDueOn?: Date | string | null;
    maintenanceIntervalDays?: number | null;
    nextMaintenanceDueOn?: Date | string | null;
    site?: { id: string; name: string };
    category?: { id: string; name: string; iconKey?: string };
    section?: { id: string; name: string };
  };
  actorRole: Role;
  actorSiteId: string | null;
  sites: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; maxBookingMinutes: number; iconKey: string }>;
  sections: Array<{ id: string; name: string }>;
  trigger?: React.ReactNode;
}

function buildInitialEquipment(resource: ResourceEditDialogProps["resource"]): EquipmentFormState {
  const inServiceOnStr = resource.inServiceOn
    ? typeof resource.inServiceOn === "string"
      ? resource.inServiceOn
      : dbToDay(resource.inServiceOn)
    : "";
  const reviewDueOnStr = resource.replacementReviewDueOn
    ? typeof resource.replacementReviewDueOn === "string"
      ? resource.replacementReviewDueOn
      : dbToDay(resource.replacementReviewDueOn)
    : "";
  const calibDueOnStr = resource.nextCalibrationDueOn
    ? typeof resource.nextCalibrationDueOn === "string"
      ? resource.nextCalibrationDueOn
      : dbToDay(resource.nextCalibrationDueOn)
    : "";
  const maintDueOnStr = resource.nextMaintenanceDueOn
    ? typeof resource.nextMaintenanceDueOn === "string"
      ? resource.nextMaintenanceDueOn
      : dbToDay(resource.nextMaintenanceDueOn)
    : "";

  return {
    manufacturer: resource.manufacturer ?? "",
    model: resource.model ?? "",
    serialNumber: resource.serialNumber ?? "",
    inServiceOn: inServiceOnStr,
    expectedServiceLifeYears: resource.expectedServiceLifeYears
      ? String(resource.expectedServiceLifeYears)
      : "",
    replacementReviewDueOn: reviewDueOnStr,
    needsCalibration: Boolean(resource.calibrationIntervalDays || resource.nextCalibrationDueOn),
    calibrationIntervalDays: resource.calibrationIntervalDays
      ? String(resource.calibrationIntervalDays)
      : "",
    lastCalibratedOn: "",
    calibratedBy: "",
    calibrationReference: "",
    nextCalibrationDueOn: calibDueOnStr,
    needsMaintenance: Boolean(resource.maintenanceIntervalDays || resource.nextMaintenanceDueOn),
    maintenanceIntervalDays: resource.maintenanceIntervalDays
      ? String(resource.maintenanceIntervalDays)
      : "",
    lastServicedOn: "",
    servicedBy: "",
    nextMaintenanceDueOn: maintDueOnStr,
  };
}

export function ResourceEditDialog({
  resource,
  actorRole,
  actorSiteId,
  sites,
  categories,
  sections,
  trigger,
}: ResourceEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [showOverdueWarning, setShowOverdueWarning] = React.useState(false);

  const isManager = actorRole === "MANAGER";

  const [name, setName] = React.useState(resource.name);
  const [siteId, setSiteId] = React.useState(resource.siteId);
  const [categoryId, setCategoryId] = React.useState(resource.categoryId);
  const [sectionId, setSectionId] = React.useState(resource.sectionId);
  const [location, setLocation] = React.useState(resource.location ?? "");
  const [capacity, setCapacity] = React.useState(
    resource.capacity !== null && resource.capacity !== undefined ? String(resource.capacity) : "",
  );
  const [equipment, setEquipment] = React.useState<EquipmentFormState>(() =>
    buildInitialEquipment(resource),
  );

  const resetForm = () => {
    setName(resource.name);
    setSiteId(resource.siteId);
    setCategoryId(resource.categoryId);
    setSectionId(resource.sectionId);
    setLocation(resource.location ?? "");
    setCapacity(
      resource.capacity !== null && resource.capacity !== undefined
        ? String(resource.capacity)
        : "",
    );
    setEquipment(buildInitialEquipment(resource));
    setError(null);
    setFieldErrors({});
    setShowOverdueWarning(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      resetForm();
    }
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const currentSiteName =
    sites.find((s) => s.id === (isManager ? actorSiteId : siteId))?.name ??
    resource.site?.name ??
    "Assigned site";

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
    } else {
      formData.append("location", "");
    }
    if (capacity.trim()) {
      formData.append("capacity", capacity.trim());
    } else {
      formData.append("capacity", "");
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

    const result: ResourceActionResult = await updateResourceAction(resource.id, null, formData);
    setIsPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to save changes.");
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      return;
    }

    toast.success(result.message ?? "Changes saved");
    setOpen(false);
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
              type="button"
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#18202f] hover:bg-[#222a3a] text-xs font-mono font-medium text-[#dbe2f8] hover:text-white border border-[#334155] hover:border-[#6cd8cb]/50 transition-all duration-150 active:scale-[0.98]"
            >
              <Pencil className="size-3.5 text-[#6cd8cb]" />
              <span>Edit</span>
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0 overflow-hidden">
            <DialogHeader className="p-6 pb-4 border-b border-[#1e293b]">
              <DialogTitle>Edit {resource.name}</DialogTitle>
              <DialogDescription>
                Update equipment specifications, location or assigned department.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <ResourceCoreFields
                idPrefix="dialog-edit"
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
                {isPending ? "Saving..." : "Save changes"}
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
