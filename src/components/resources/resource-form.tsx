"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { dbToDay, isValidDay, todayDay, addDaysToDay, addYearsToDay } from "@/lib/equipment-dates";
import { CategoryIcon } from "@/components/category-icon";
import { SectionCard } from "@/components/ui/section-card";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { ErrorSummary } from "@/components/ui/error-summary";
import { cn } from "@/lib/utils";

export interface ResourceFormProps {
  initialData?: {
    id: string;
    name: string;
    siteId: string;
    categoryId: string;
    sectionId: string;
    location: string | null;
    capacity: number | null;
    status?: string;
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

export function ResourceForm({
  initialData,
  actorRole,
  actorSiteId,
  sites,
  categories,
  sections,
  isEdit = false,
}: ResourceFormProps) {
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

  // Equipment details
  const [manufacturer, setManufacturer] = React.useState(initialData?.manufacturer ?? "");
  const [model, setModel] = React.useState(initialData?.model ?? "");
  const [serialNumber, setSerialNumber] = React.useState(initialData?.serialNumber ?? "");
  const [inServiceOn, setInServiceOn] = React.useState(() => {
    if (!initialData?.inServiceOn) return "";
    return typeof initialData.inServiceOn === "string"
      ? initialData.inServiceOn
      : dbToDay(initialData.inServiceOn);
  });
  const [serviceLifeYears, setServiceLifeYears] = React.useState(
    initialData?.expectedServiceLifeYears ? String(initialData.expectedServiceLifeYears) : "",
  );
  const [replacementReviewDueOn, setReplacementReviewDueOn] = React.useState(() => {
    if (!initialData?.replacementReviewDueOn) return "";
    return typeof initialData.replacementReviewDueOn === "string"
      ? initialData.replacementReviewDueOn
      : dbToDay(initialData.replacementReviewDueOn);
  });

  // Schedules: Calibration
  const [calibrationIntervalDays, setCalibrationIntervalDays] = React.useState(
    initialData?.calibrationIntervalDays ? String(initialData.calibrationIntervalDays) : "",
  );
  const [lastCalibratedOn, setLastCalibratedOn] = React.useState("");
  const [nextCalibrationDueOn, setNextCalibrationDueOn] = React.useState(() => {
    if (!initialData?.nextCalibrationDueOn) return "";
    return typeof initialData.nextCalibrationDueOn === "string"
      ? initialData.nextCalibrationDueOn
      : dbToDay(initialData.nextCalibrationDueOn);
  });

  // Schedules: Maintenance
  const [maintenanceIntervalDays, setMaintenanceIntervalDays] = React.useState(
    initialData?.maintenanceIntervalDays ? String(initialData.maintenanceIntervalDays) : "",
  );
  const [lastServicedOn, setLastServicedOn] = React.useState("");
  const [nextMaintenanceDueOn, setNextMaintenanceDueOn] = React.useState(() => {
    if (!initialData?.nextMaintenanceDueOn) return "";
    return typeof initialData.nextMaintenanceDueOn === "string"
      ? initialData.nextMaintenanceDueOn
      : dbToDay(initialData.nextMaintenanceDueOn);
  });

  const [showOverdueWarning, setShowOverdueWarning] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  // Calculations
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isRoom = selectedCategory?.iconKey === "room";
  const selectedSite = sites.find((s) => s.id === (isManager ? (actorSiteId ?? siteId) : siteId));

  // Change handlers with inline recalculation (no cascading render effects)
  const handleInServiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInServiceOn(val);
    if (isValidDay(val) && Number(serviceLifeYears) > 0) {
      setReplacementReviewDueOn(addYearsToDay(val, Number(serviceLifeYears)));
    }
  };

  const handleServiceLifeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setServiceLifeYears(val);
    if (isValidDay(inServiceOn) && Number(val) > 0) {
      setReplacementReviewDueOn(addYearsToDay(inServiceOn, Number(val)));
    }
  };

  const handleCalibIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCalibrationIntervalDays(val);
    if (isValidDay(lastCalibratedOn) && Number(val) > 0) {
      setNextCalibrationDueOn(addDaysToDay(lastCalibratedOn, Number(val)));
    }
  };

  const handleLastCalibratedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLastCalibratedOn(val);
    if (isValidDay(val) && Number(calibrationIntervalDays) > 0) {
      setNextCalibrationDueOn(addDaysToDay(val, Number(calibrationIntervalDays)));
    }
  };

  const handleMaintIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMaintenanceIntervalDays(val);
    if (isValidDay(lastServicedOn) && Number(val) > 0) {
      setNextMaintenanceDueOn(addDaysToDay(lastServicedOn, Number(val)));
    }
  };

  const handleLastServicedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLastServicedOn(val);
    if (isValidDay(val) && Number(maintenanceIntervalDays) > 0) {
      setNextMaintenanceDueOn(addDaysToDay(val, Number(maintenanceIntervalDays)));
    }
  };

  const submitForm = async () => {
    setIsPending(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("siteId", isManager ? (actorSiteId ?? siteId) : siteId);
    formData.set("categoryId", categoryId);
    formData.set("sectionId", sectionId);
    if (location.trim()) formData.set("location", location.trim());
    if (capacity.trim()) formData.set("capacity", capacity.trim());

    // Equipment fields
    formData.set("manufacturer", manufacturer.trim());
    formData.set("model", model.trim());
    formData.set("serialNumber", serialNumber.trim());
    formData.set("inServiceOn", inServiceOn);
    formData.set("expectedServiceLifeYears", serviceLifeYears);
    formData.set("replacementReviewDueOn", replacementReviewDueOn);

    const needsCalib = Boolean(calibrationIntervalDays.trim() || nextCalibrationDueOn.trim());
    formData.set("needsCalibration", needsCalib ? "true" : "false");
    formData.set("calibrationIntervalDays", calibrationIntervalDays);
    formData.set("lastCalibratedOn", lastCalibratedOn);
    formData.set("calibratedBy", "");
    formData.set("calibrationReference", "");
    formData.set("nextCalibrationDueOn", nextCalibrationDueOn);

    const needsMaint = Boolean(maintenanceIntervalDays.trim() || nextMaintenanceDueOn.trim());
    formData.set("needsMaintenance", needsMaint ? "true" : "false");
    formData.set("maintenanceIntervalDays", maintenanceIntervalDays);
    formData.set("lastServicedOn", lastServicedOn);
    formData.set("servicedBy", "");
    formData.set("nextMaintenanceDueOn", nextMaintenanceDueOn);

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
      window.location.assign(`/resources/${initialData.id}`);
    } else if (result.resourceId) {
      window.location.assign(`/resources/${result.resourceId}`);
    } else {
      window.location.assign("/resources");
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const today = todayDay();
    if (nextCalibrationDueOn && isValidDay(nextCalibrationDueOn) && nextCalibrationDueOn < today) {
      setShowOverdueWarning(true);
      return;
    }
    submitForm();
  };

  const errorList = React.useMemo(() => {
    const list: Array<{ field?: string; message: string }> = [];
    if (error) list.push({ message: error });
    for (const [key, msgs] of Object.entries(fieldErrors)) {
      if (msgs?.[0]) {
        list.push({ field: `field-${key}`, message: `${key}: ${msgs[0]}` });
      }
    }
    return list;
  }, [error, fieldErrors]);

  const hasName = name.trim().length >= 2;
  const hasCategory = Boolean(categoryId);
  const hasSite = Boolean(isManager ? actorSiteId || siteId : siteId);
  const hasSection = Boolean(sectionId);

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 pb-24 lg:pb-8">
        {/* Error summary */}
        {errorList.length > 0 && <ErrorSummary errors={errorList} className="mb-6" />}

        {/* 2-Column Responsive Layout: Left Form (65%) / Right Preview (35%) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 lg:gap-8 items-start">
          {/* LEFT COLUMN: 4 Numbered Section Cards */}
          <div className="space-y-6">
            {/* Section 1: Basics */}
            <SectionCard number={1} title="Basics" description="What it is and where it belongs.">
              <div className="space-y-4 pt-1">
                {/* Name */}
                <div className="space-y-1.5" id="field-name">
                  <Label
                    htmlFor="resource-name"
                    className="text-xs font-bold text-navy flex items-center gap-1"
                  >
                    <span>Name</span>
                    <span className="text-red">*</span>
                  </Label>
                  <Input
                    id="resource-name"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. HPLC System"
                    required
                    minLength={2}
                    maxLength={80}
                    disabled={isPending}
                    className="h-11 rounded-xl border-card-edge bg-card text-sm text-navy placeholder:text-faint focus:border-teal"
                  />
                  <p className="text-[11px] text-muted">Unique within the laboratory site.</p>
                  {fieldErrors.name && (
                    <p className="text-xs font-semibold text-red">{fieldErrors.name[0]}</p>
                  )}
                </div>

                {/* Category & Site Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category */}
                  <div className="space-y-1.5" id="field-categoryId">
                    <Label
                      htmlFor="resource-category"
                      className="text-xs font-bold text-navy flex items-center gap-1"
                    >
                      <span>Category</span>
                      <span className="text-red">*</span>
                    </Label>
                    <select
                      id="resource-category"
                      name="categoryId"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      disabled={isPending}
                      required
                      className="h-11 w-full rounded-xl border border-card-edge bg-card px-3 text-sm font-semibold text-navy focus:border-teal focus:outline-none cursor-pointer"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.categoryId && (
                      <p className="text-xs font-semibold text-red">{fieldErrors.categoryId[0]}</p>
                    )}
                  </div>

                  {/* Site */}
                  <div className="space-y-1.5" id="field-siteId">
                    <Label
                      htmlFor="resource-site"
                      className="text-xs font-bold text-navy flex items-center gap-1"
                    >
                      <span>Site</span>
                      <span className="text-red">*</span>
                    </Label>
                    {isManager ? (
                      <div>
                        <Input
                          id="resource-site"
                          value={selectedSite?.name ?? "Assigned site"}
                          disabled
                          className="h-11 rounded-xl border-card-edge bg-canvas text-sm font-semibold text-muted"
                        />
                        <input type="hidden" name="siteId" value={actorSiteId ?? ""} />
                      </div>
                    ) : (
                      <select
                        id="resource-site"
                        name="siteId"
                        value={siteId}
                        onChange={(e) => setSiteId(e.target.value)}
                        disabled={isPending}
                        required
                        className="h-11 w-full rounded-xl border border-card-edge bg-card px-3 text-sm font-semibold text-navy focus:border-teal focus:outline-none cursor-pointer"
                      >
                        {sites.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {fieldErrors.siteId && (
                      <p className="text-xs font-semibold text-red">{fieldErrors.siteId[0]}</p>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Section 2: Section & location */}
            <SectionCard
              number={2}
              title="Section & location"
              description="Who owns it and where to find it."
            >
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Owning section */}
                  <div className="space-y-1.5" id="field-sectionId">
                    <Label
                      htmlFor="resource-section"
                      className="text-xs font-bold text-navy flex items-center gap-1"
                    >
                      <span>Owning section</span>
                      <span className="text-red">*</span>
                    </Label>
                    <select
                      id="resource-section"
                      name="sectionId"
                      value={sectionId}
                      onChange={(e) => setSectionId(e.target.value)}
                      disabled={isPending}
                      required
                      className="h-11 w-full rounded-xl border border-card-edge bg-card px-3 text-sm font-semibold text-navy focus:border-teal focus:outline-none cursor-pointer"
                    >
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.sectionId && (
                      <p className="text-xs font-semibold text-red">{fieldErrors.sectionId[0]}</p>
                    )}
                  </div>

                  {/* Physical location */}
                  <div className="space-y-1.5" id="field-location">
                    <Label htmlFor="resource-location" className="text-xs font-bold text-navy">
                      Location (optional)
                    </Label>
                    <Input
                      id="resource-location"
                      name="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Room 2.14, bench B"
                      maxLength={120}
                      disabled={isPending}
                      className="h-11 rounded-xl border-card-edge bg-card text-sm text-navy placeholder:text-faint focus:border-teal"
                    />
                    {fieldErrors.location && (
                      <p className="text-xs font-semibold text-red">{fieldErrors.location[0]}</p>
                    )}
                  </div>
                </div>

                {/* Seating capacity (for rooms) */}
                {isRoom && (
                  <div className="space-y-1.5" id="field-capacity">
                    <Label htmlFor="resource-capacity" className="text-xs font-bold text-navy">
                      Seating capacity
                    </Label>
                    <Input
                      id="resource-capacity"
                      name="capacity"
                      type="number"
                      min={1}
                      max={500}
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      placeholder="e.g. 20"
                      disabled={isPending}
                      className="h-11 rounded-xl border-card-edge bg-card text-sm text-navy placeholder:text-faint focus:border-teal max-w-[200px]"
                    />
                    <p className="text-[11px] text-muted">
                      Attendee limit for safety and room capacity control.
                    </p>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Section 3: Equipment details (Shown for instruments/equipment) */}
            <SectionCard
              number={3}
              title="Equipment details"
              description="Shown for instruments. Rooms skip this."
              action={
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal-soft text-teal">
                  {selectedCategory?.name ?? "Instrument"}
                </span>
              }
            >
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="equipment-manufacturer" className="text-xs font-bold text-navy">
                      Manufacturer
                    </Label>
                    <Input
                      id="equipment-manufacturer"
                      value={manufacturer}
                      onChange={(e) => setManufacturer(e.target.value)}
                      placeholder="e.g. LabTech"
                      disabled={isPending}
                      className="h-11 rounded-xl border-card-edge bg-card text-sm text-navy placeholder:text-faint focus:border-teal"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="equipment-model" className="text-xs font-bold text-navy">
                      Model
                    </Label>
                    <Input
                      id="equipment-model"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="e.g. LC-2040"
                      disabled={isPending}
                      className="h-11 rounded-xl border-card-edge bg-card text-sm text-navy placeholder:text-faint focus:border-teal"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="equipment-serial" className="text-xs font-bold text-navy">
                      Serial number
                    </Label>
                    <Input
                      id="equipment-serial"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder="e.g. HP-40213-77"
                      disabled={isPending}
                      className="h-11 rounded-xl border-card-edge bg-card text-sm text-navy placeholder:text-faint focus:border-teal"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="equipment-in-service" className="text-xs font-bold text-navy">
                      In service since
                    </Label>
                    <Input
                      id="equipment-in-service"
                      type="date"
                      value={inServiceOn}
                      onChange={handleInServiceChange}
                      disabled={isPending}
                      className="h-11 rounded-xl border-card-edge bg-card text-sm text-navy focus:border-teal"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="equipment-service-life" className="text-xs font-bold text-navy">
                      Service life
                    </Label>
                    <div className="relative">
                      <Input
                        id="equipment-service-life"
                        type="number"
                        min={1}
                        max={50}
                        value={serviceLifeYears}
                        onChange={handleServiceLifeChange}
                        placeholder="10"
                        disabled={isPending}
                        className="h-11 rounded-xl border-card-edge bg-card pr-14 text-sm text-navy focus:border-teal"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted pointer-events-none">
                        years
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Section 4: Schedules */}
            <SectionCard
              number={4}
              title="Schedules"
              description="From the manufacturer's manual. Leave empty if not tracked."
            >
              <div className="space-y-5 pt-1">
                {/* Calibration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="sched-calib-interval" className="text-xs font-bold text-navy">
                      Calibrate every
                    </Label>
                    <div className="relative">
                      <Input
                        id="sched-calib-interval"
                        type="number"
                        min={1}
                        max={3650}
                        value={calibrationIntervalDays}
                        onChange={handleCalibIntervalChange}
                        placeholder="180"
                        disabled={isPending}
                        className="h-11 rounded-xl border-card-edge bg-card pr-14 text-sm text-navy focus:border-teal"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted pointer-events-none">
                        days
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sched-calib-last" className="text-xs font-bold text-navy">
                      Last calibrated
                    </Label>
                    <Input
                      id="sched-calib-last"
                      type="date"
                      value={lastCalibratedOn}
                      onChange={handleLastCalibratedChange}
                      disabled={isPending}
                      className="h-11 rounded-xl border-card-edge bg-card text-sm text-navy focus:border-teal"
                    />
                    {nextCalibrationDueOn ? (
                      <p className="text-[11px] font-semibold text-teal mt-1">
                        Next calibration due: {nextCalibrationDueOn}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Maintenance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="sched-maint-interval" className="text-xs font-bold text-navy">
                      Service every
                    </Label>
                    <div className="relative">
                      <Input
                        id="sched-maint-interval"
                        type="number"
                        min={1}
                        max={3650}
                        value={maintenanceIntervalDays}
                        onChange={handleMaintIntervalChange}
                        placeholder="90"
                        disabled={isPending}
                        className="h-11 rounded-xl border-card-edge bg-card pr-14 text-sm text-navy focus:border-teal"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted pointer-events-none">
                        days
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sched-maint-last" className="text-xs font-bold text-navy">
                      Last serviced
                    </Label>
                    <Input
                      id="sched-maint-last"
                      type="date"
                      value={lastServicedOn}
                      onChange={handleLastServicedChange}
                      disabled={isPending}
                      className="h-11 rounded-xl border-card-edge bg-card text-sm text-navy focus:border-teal"
                    />
                    {nextMaintenanceDueOn ? (
                      <p className="text-[11px] font-semibold text-teal mt-1">
                        Next service due: {nextMaintenanceDueOn}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Desktop Bottom Action Row */}
            <div className="hidden sm:flex items-center justify-between pt-4 border-t border-line">
              <span className="text-xs text-muted">Fields marked * are required.</span>
              <div className="flex items-center gap-3">
                <Button
                  asChild
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  className="h-11 px-6 rounded-xl border-card-edge bg-card hover:bg-canvas text-navy font-bold text-xs"
                >
                  <Link
                    href={isEdit && initialData?.id ? `/resources/${initialData.id}` : "/resources"}
                  >
                    Cancel
                  </Link>
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-11 px-7 rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-xs shadow-teal hover:opacity-95"
                >
                  {isPending ? "Saving..." : isEdit ? "Save resource" : "Save resource"}
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Preview (Desktop Sticky) */}
          <div className="hidden lg:block sticky top-20 space-y-4">
            <div className="rounded-[20px] bg-card border border-card-edge p-5 shadow-v4 space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
                  Live Preview
                </span>
                <span className="text-[11px] text-faint">Sticky while scrolling</span>
              </div>

              {/* Resource Card Preview */}
              <div className="rounded-2xl border border-card-edge bg-canvas p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <CategoryIcon iconKey={selectedCategory?.iconKey ?? "other"} />
                    <div>
                      <h4 className="font-extrabold text-navy text-sm leading-tight">
                        {name.trim() || "Resource name"}
                      </h4>
                      <p className="text-xs text-muted mt-0.5">
                        {selectedCategory?.name ?? "Category"}
                      </p>
                      <p className="text-[11px] text-muted">{selectedSite?.name ?? "Site"}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-soft text-teal-deep border border-teal-line">
                    ACTIVE
                  </span>
                </div>

                <div className="pt-2 border-t border-line space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted font-medium">Booking limit</span>
                    <span className="font-bold text-navy">
                      Up to{" "}
                      {selectedCategory ? Math.round(selectedCategory.maxBookingMinutes / 60) : 12}{" "}
                      h
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted font-medium">Next calibration</span>
                    {nextCalibrationDueOn ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-soft text-amber">
                        {nextCalibrationDueOn}
                      </span>
                    ) : (
                      <span className="text-faint">Not tracked</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted font-medium">Next service</span>
                    {nextMaintenanceDueOn ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-soft text-teal-deep border border-teal-line">
                        {nextMaintenanceDueOn}
                      </span>
                    ) : (
                      <span className="text-faint">Not tracked</span>
                    )}
                  </div>
                  {replacementReviewDueOn && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted font-medium">Replacement review</span>
                      <span className="font-bold text-navy">{replacementReviewDueOn}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Required Fields Checklist */}
              <div className="pt-2 border-t border-line space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted block">
                  Required fields
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "size-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                          hasName ? "bg-teal-soft text-teal-deep" : "bg-red-soft text-red",
                        )}
                      >
                        {hasName ? <Check className="size-3" /> : "×"}
                      </div>
                      <span className={cn(hasName ? "text-navy" : "text-red font-medium")}>
                        Name
                      </span>
                    </div>
                    {!hasName && (
                      <a
                        href="#field-name"
                        className="text-[11px] text-red font-bold hover:underline"
                      >
                        Go to field →
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "size-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                          hasCategory ? "bg-teal-soft text-teal-deep" : "bg-red-soft text-red",
                        )}
                      >
                        {hasCategory ? <Check className="size-3" /> : "×"}
                      </div>
                      <span className={cn(hasCategory ? "text-navy" : "text-red font-medium")}>
                        Category
                      </span>
                    </div>
                    {!hasCategory && (
                      <a
                        href="#field-categoryId"
                        className="text-[11px] text-red font-bold hover:underline"
                      >
                        Go to field →
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "size-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                          hasSite ? "bg-teal-soft text-teal-deep" : "bg-red-soft text-red",
                        )}
                      >
                        {hasSite ? <Check className="size-3" /> : "×"}
                      </div>
                      <span className={cn(hasSite ? "text-navy" : "text-red font-medium")}>
                        Site
                      </span>
                    </div>
                    {!hasSite && (
                      <a
                        href="#field-siteId"
                        className="text-[11px] text-red font-bold hover:underline"
                      >
                        Go to field →
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "size-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                          hasSection ? "bg-teal-soft text-teal-deep" : "bg-red-soft text-red",
                        )}
                      >
                        {hasSection ? <Check className="size-3" /> : "×"}
                      </div>
                      <span className={cn(hasSection ? "text-navy" : "text-red font-medium")}>
                        Owning section
                      </span>
                    </div>
                    {!hasSection && (
                      <a
                        href="#field-sectionId"
                        className="text-[11px] text-red font-bold hover:underline"
                      >
                        Go to field →
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Informational Hint */}
              <div className="rounded-xl border border-teal-soft bg-mint/30 p-3 text-xs text-teal leading-relaxed">
                <p className="font-bold text-teal-deep mb-0.5">Clinical Equipment Rules</p>
                Calibration and preventive maintenance due dates will be automatically scheduled
                onto the Clinical Calendar.
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE STICKY ACTION BAR (< 640px) */}
        <StickyActionBar className="sm:hidden">
          <Button
            asChild
            type="button"
            variant="outline"
            disabled={isPending}
            className="w-28 h-11 rounded-xl border-card-edge bg-card text-navy font-bold text-xs"
          >
            <Link href={isEdit && initialData?.id ? `/resources/${initialData.id}` : "/resources"}>
              Cancel
            </Link>
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="flex-1 h-11 rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-xs shadow-teal hover:opacity-95"
          >
            {isPending ? "Saving..." : "Save resource"}
          </Button>
        </StickyActionBar>
      </form>

      {/* Calibration Overdue Warning Dialog */}
      <AlertDialog open={showOverdueWarning} onOpenChange={setShowOverdueWarning}>
        <AlertDialogContent className="sm:max-w-md rounded-2xl bg-card border border-card-edge p-6 shadow-v4">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-navy">
              Calibration is overdue
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted leading-relaxed">
              The next calibration date is in the past. Nobody can book this instrument until a
              current calibration record is registered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              onClick={() => setShowOverdueWarning(false)}
              className="rounded-xl border-card-edge text-navy font-bold"
            >
              Go back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowOverdueWarning(false);
                submitForm();
              }}
              className="rounded-xl bg-amber hover:bg-amber/90 text-white font-bold"
            >
              Save anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
