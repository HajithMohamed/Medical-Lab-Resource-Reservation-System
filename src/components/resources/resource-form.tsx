"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  createResourceAction,
  updateResourceAction,
  type ResourceActionResult,
} from "@/actions/resources";
import type { Role } from "@/generated/prisma/client";
import { ResourceCoreFields } from "./resource-core-fields";
import { EquipmentFields, type EquipmentFormState } from "./equipment-fields";
import { dbToDay, isValidDay, todayDay } from "@/lib/equipment-dates";

interface ResourceFormProps {
  initialData?: {
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
  };
  actorRole: Role;
  actorSiteId: string | null;
  sites: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; maxBookingMinutes: number; iconKey: string }>;
  sections: Array<{ id: string; name: string }>;
  isEdit?: boolean;
}

function buildInitialEquipment(data?: ResourceFormProps["initialData"]): EquipmentFormState {
  const inServiceOnStr = data?.inServiceOn
    ? typeof data.inServiceOn === "string"
      ? data.inServiceOn
      : dbToDay(data.inServiceOn)
    : "";
  const reviewDueOnStr = data?.replacementReviewDueOn
    ? typeof data.replacementReviewDueOn === "string"
      ? data.replacementReviewDueOn
      : dbToDay(data.replacementReviewDueOn)
    : "";
  const calibDueOnStr = data?.nextCalibrationDueOn
    ? typeof data.nextCalibrationDueOn === "string"
      ? data.nextCalibrationDueOn
      : dbToDay(data.nextCalibrationDueOn)
    : "";
  const maintDueOnStr = data?.nextMaintenanceDueOn
    ? typeof data.nextMaintenanceDueOn === "string"
      ? data.nextMaintenanceDueOn
      : dbToDay(data.nextMaintenanceDueOn)
    : "";

  return {
    manufacturer: data?.manufacturer ?? "",
    model: data?.model ?? "",
    serialNumber: data?.serialNumber ?? "",
    inServiceOn: inServiceOnStr,
    expectedServiceLifeYears: data?.expectedServiceLifeYears
      ? String(data.expectedServiceLifeYears)
      : "",
    replacementReviewDueOn: reviewDueOnStr,
    needsCalibration: Boolean(data?.calibrationIntervalDays || data?.nextCalibrationDueOn),
    calibrationIntervalDays: data?.calibrationIntervalDays
      ? String(data.calibrationIntervalDays)
      : "",
    lastCalibratedOn: "",
    calibratedBy: "",
    calibrationReference: "",
    nextCalibrationDueOn: calibDueOnStr,
    needsMaintenance: Boolean(data?.maintenanceIntervalDays || data?.nextMaintenanceDueOn),
    maintenanceIntervalDays: data?.maintenanceIntervalDays
      ? String(data.maintenanceIntervalDays)
      : "",
    lastServicedOn: "",
    servicedBy: "",
    nextMaintenanceDueOn: maintDueOnStr,
  };
}

export function ResourceForm({
  initialData,
  actorRole,
  actorSiteId,
  sites,
  categories,
  sections,
  isEdit = false,
}: ResourceFormProps) {
  const router = useRouter();

  const isManager = actorRole === "MANAGER";
  const defaultSiteId =
    initialData?.siteId ?? (isManager ? (actorSiteId ?? "") : (sites[0]?.id ?? ""));

  const [name, setName] = React.useState(initialData?.name ?? "");
  const [siteId, setSiteId] = React.useState<string>(defaultSiteId);
  const [categoryId, setCategoryId] = React.useState<string>(
    initialData?.categoryId ?? categories[0]?.id ?? "",
  );
  const [sectionId, setSectionId] = React.useState<string>(
    initialData?.sectionId ?? sections[0]?.id ?? "",
  );
  const [location, setLocation] = React.useState(initialData?.location ?? "");
  const [capacity, setCapacity] = React.useState<string>(
    initialData?.capacity !== null && initialData?.capacity !== undefined
      ? String(initialData.capacity)
      : "",
  );

  const [equipment, setEquipment] = React.useState<EquipmentFormState>(() =>
    buildInitialEquipment(initialData),
  );
  const [showOverdueWarning, setShowOverdueWarning] = React.useState(false);

  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const currentSiteName =
    sites.find((s) => s.id === (isManager ? actorSiteId : siteId))?.name ?? "Assigned site";

  const submitForm = async () => {
    setIsPending(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("siteId", isManager ? (actorSiteId ?? siteId) : siteId);
    formData.set("categoryId", categoryId);
    formData.set("sectionId", sectionId);
    if (location.trim()) {
      formData.set("location", location.trim());
    }
    if (capacity.trim()) {
      formData.set("capacity", capacity.trim());
    }

    // Equipment fields
    formData.set("manufacturer", equipment.manufacturer.trim());
    formData.set("model", equipment.model.trim());
    formData.set("serialNumber", equipment.serialNumber.trim());
    formData.set("inServiceOn", equipment.inServiceOn);
    formData.set("expectedServiceLifeYears", equipment.expectedServiceLifeYears);
    formData.set("replacementReviewDueOn", equipment.replacementReviewDueOn);

    formData.set("needsCalibration", equipment.needsCalibration ? "true" : "false");
    formData.set("calibrationIntervalDays", equipment.calibrationIntervalDays);
    formData.set("lastCalibratedOn", equipment.lastCalibratedOn);
    formData.set("calibratedBy", equipment.calibratedBy.trim());
    formData.set("calibrationReference", equipment.calibrationReference.trim());
    formData.set("nextCalibrationDueOn", equipment.nextCalibrationDueOn);

    formData.set("needsMaintenance", equipment.needsMaintenance ? "true" : "false");
    formData.set("maintenanceIntervalDays", equipment.maintenanceIntervalDays);
    formData.set("lastServicedOn", equipment.lastServicedOn);
    formData.set("servicedBy", equipment.servicedBy.trim());
    formData.set("nextMaintenanceDueOn", equipment.nextMaintenanceDueOn);

    let result: ResourceActionResult;

    if (isEdit && initialData?.id) {
      result = await updateResourceAction(initialData.id, null, formData);
    } else {
      result = await createResourceAction(null, formData);
    }

    setIsPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to save resource.");
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      return;
    }

    toast.success(result.message ?? (isEdit ? "Changes saved" : "Resource added"));

    if (isEdit && initialData?.id) {
      router.push(`/resources/${initialData.id}`);
    } else if (result.resourceId) {
      router.push(`/resources/${result.resourceId}`);
    } else {
      router.push("/resources");
    }
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
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>
              {isEdit ? `Edit ${initialData?.name ?? "resource"}` : "Add resource"}
            </CardTitle>
            <CardDescription>
              {isEdit
                ? "Update equipment specifications, location or assigned department."
                : "Register an instrument, biosafety cabinet, room or van into the network."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <ResourceCoreFields
              idPrefix="resource-form"
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
          </CardContent>

          <CardFooter className="flex items-center justify-end gap-3 pt-4 border-t border-[#1e293b]">
            <Button asChild variant="outline" type="button" disabled={isPending}>
              <Link
                href={isEdit && initialData?.id ? `/resources/${initialData.id}` : "/resources"}
              >
                Cancel
              </Link>
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold"
            >
              {isPending
                ? isEdit
                  ? "Saving..."
                  : "Adding..."
                : isEdit
                  ? "Save changes"
                  : "Add resource"}
            </Button>
          </CardFooter>
        </form>
      </Card>

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
