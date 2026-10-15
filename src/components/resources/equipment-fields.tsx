"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { equipmentPartsFor, equipmentLabelsFor } from "@/config/equipment";
import { isValidDay, addDaysToDay, addYearsToDay } from "@/lib/equipment-dates";

export interface EquipmentFormState {
  // Part 2: Details
  manufacturer: string;
  model: string;
  serialNumber: string;
  inServiceOn: string;
  expectedServiceLifeYears: string;
  replacementReviewDueOn: string;

  // Part 3: Calibration
  needsCalibration: boolean;
  calibrationIntervalDays: string;
  lastCalibratedOn: string;
  calibratedBy: string;
  calibrationReference: string;
  nextCalibrationDueOn: string;

  // Part 4: Preventive maintenance
  needsMaintenance: boolean;
  maintenanceIntervalDays: string;
  lastServicedOn: string;
  servicedBy: string;
  nextMaintenanceDueOn: string;
}

export interface EquipmentFieldsProps {
  iconKey: string;
  values: EquipmentFormState;
  onChange: React.Dispatch<React.SetStateAction<EquipmentFormState>>;
  fieldErrors?: Record<string, string[]>;
  disabled?: boolean;
}

export function EquipmentFields({
  iconKey,
  values,
  onChange,
  fieldErrors = {},
  disabled = false,
}: EquipmentFieldsProps) {
  const parts = equipmentPartsFor(iconKey);
  const labels = equipmentLabelsFor(iconKey);

  const hasDetails = parts.includes("details");
  const hasCalibration = parts.includes("calibration");
  const hasMaintenance = parts.includes("maintenance");

  const [reviewManuallyEdited, setReviewManuallyEdited] = React.useState(
    Boolean(values.replacementReviewDueOn),
  );
  const [calibDueManuallyEdited, setCalibDueManuallyEdited] = React.useState(
    Boolean(values.nextCalibrationDueOn),
  );
  const [maintDueManuallyEdited, setMaintDueManuallyEdited] = React.useState(
    Boolean(values.nextMaintenanceDueOn),
  );

  // Live auto-calculation for Replacement review due: inServiceOn + life years
  const handleInServiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInService = e.target.value;
    onChange((prev) => {
      let nextReview = prev.replacementReviewDueOn;
      if (
        !reviewManuallyEdited &&
        isValidDay(newInService) &&
        Number(prev.expectedServiceLifeYears) > 0
      ) {
        nextReview = addYearsToDay(newInService, Number(prev.expectedServiceLifeYears));
      }
      return { ...prev, inServiceOn: newInService, replacementReviewDueOn: nextReview };
    });
  };

  const handleLifeYearsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLife = e.target.value;
    onChange((prev) => {
      let nextReview = prev.replacementReviewDueOn;
      if (!reviewManuallyEdited && isValidDay(prev.inServiceOn) && Number(newLife) > 0) {
        nextReview = addYearsToDay(prev.inServiceOn, Number(newLife));
      }
      return { ...prev, expectedServiceLifeYears: newLife, replacementReviewDueOn: nextReview };
    });
  };

  const handleReviewDueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReviewManuallyEdited(true);
    const val = e.target.value;
    onChange((prev) => ({ ...prev, replacementReviewDueOn: val }));
  };

  // Live auto-calculation for Next calibration due: lastCalibratedOn + interval
  const handleCalibIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInterval = e.target.value;
    onChange((prev) => {
      let nextDue = prev.nextCalibrationDueOn;
      if (!calibDueManuallyEdited && isValidDay(prev.lastCalibratedOn) && Number(newInterval) > 0) {
        nextDue = addDaysToDay(prev.lastCalibratedOn, Number(newInterval));
      }
      return { ...prev, calibrationIntervalDays: newInterval, nextCalibrationDueOn: nextDue };
    });
  };

  const handleLastCalibratedOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLastCal = e.target.value;
    onChange((prev) => {
      let nextDue = prev.nextCalibrationDueOn;
      if (
        !calibDueManuallyEdited &&
        isValidDay(newLastCal) &&
        Number(prev.calibrationIntervalDays) > 0
      ) {
        nextDue = addDaysToDay(newLastCal, Number(prev.calibrationIntervalDays));
      }
      return { ...prev, lastCalibratedOn: newLastCal, nextCalibrationDueOn: nextDue };
    });
  };

  const handleCalibDueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCalibDueManuallyEdited(true);
    const val = e.target.value;
    onChange((prev) => ({ ...prev, nextCalibrationDueOn: val }));
  };

  // Live auto-calculation for Next maintenance due: lastServicedOn + interval
  const handleMaintIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInterval = e.target.value;
    onChange((prev) => {
      let nextDue = prev.nextMaintenanceDueOn;
      if (!maintDueManuallyEdited && isValidDay(prev.lastServicedOn) && Number(newInterval) > 0) {
        nextDue = addDaysToDay(prev.lastServicedOn, Number(newInterval));
      }
      return { ...prev, maintenanceIntervalDays: newInterval, nextMaintenanceDueOn: nextDue };
    });
  };

  const handleLastServicedOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLastService = e.target.value;
    onChange((prev) => {
      let nextDue = prev.nextMaintenanceDueOn;
      if (
        !maintDueManuallyEdited &&
        isValidDay(newLastService) &&
        Number(prev.maintenanceIntervalDays) > 0
      ) {
        nextDue = addDaysToDay(newLastService, Number(prev.maintenanceIntervalDays));
      }
      return { ...prev, lastServicedOn: newLastService, nextMaintenanceDueOn: nextDue };
    });
  };

  const handleMaintDueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMaintDueManuallyEdited(true);
    const val = e.target.value;
    onChange((prev) => ({ ...prev, nextMaintenanceDueOn: val }));
  };

  if (parts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 pt-3 border-t border-card-edge">
      {/* Part 2: Equipment details */}
      {hasDetails && (
        <div className="space-y-3.5">
          <div>
            <h3 className="text-sm font-bold text-navy tracking-tight">Equipment details</h3>
            <p className="text-xs text-muted">
              Manufacturer identity, serial number, and operational lifespan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="eq-manufacturer"
                className="text-xs font-bold uppercase tracking-wider text-muted"
              >
                Manufacturer
              </Label>
              <Input
                id="eq-manufacturer"
                name="manufacturer"
                value={values.manufacturer}
                onChange={(e) => onChange((prev) => ({ ...prev, manufacturer: e.target.value }))}
                placeholder="e.g. Thermo Fisher Scientific"
                disabled={disabled}
                maxLength={100}
                className="bg-card border-card-edge text-navy font-semibold text-xs"
              />
              {fieldErrors.manufacturer && (
                <p className="text-xs font-medium text-destructive">
                  {fieldErrors.manufacturer[0]}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="eq-model"
                className="text-xs font-bold uppercase tracking-wider text-muted"
              >
                Model
              </Label>
              <Input
                id="eq-model"
                name="model"
                value={values.model}
                onChange={(e) => onChange((prev) => ({ ...prev, model: e.target.value }))}
                placeholder="e.g. QuantStudio 5"
                disabled={disabled}
                maxLength={100}
                className="bg-card border-card-edge text-navy font-semibold text-xs"
              />
              {fieldErrors.model && (
                <p className="text-xs font-medium text-destructive">{fieldErrors.model[0]}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="eq-serial"
                className="text-xs font-bold uppercase tracking-wider text-muted"
              >
                {labels.serialNumber}
              </Label>
              <Input
                id="eq-serial"
                name="serialNumber"
                value={values.serialNumber}
                onChange={(e) => onChange((prev) => ({ ...prev, serialNumber: e.target.value }))}
                placeholder={iconKey === "vehicle" ? "e.g. WP CAA-1234" : "e.g. QS5-2024-0089"}
                disabled={disabled}
                maxLength={100}
                className="bg-card border-card-edge text-navy font-semibold text-xs"
              />
              {fieldErrors.serialNumber && (
                <p className="text-xs font-medium text-destructive">
                  {fieldErrors.serialNumber[0]}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="eq-in-service"
                className="text-xs font-bold uppercase tracking-wider text-muted"
              >
                In service since
              </Label>
              <Input
                id="eq-in-service"
                name="inServiceOn"
                type="date"
                value={values.inServiceOn}
                onChange={handleInServiceChange}
                disabled={disabled}
                className="bg-card border-card-edge text-navy font-semibold text-xs"
              />
              {fieldErrors.inServiceOn && (
                <p className="text-xs font-medium text-destructive">{fieldErrors.inServiceOn[0]}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="eq-service-life"
                className="text-xs font-bold uppercase tracking-wider text-muted"
              >
                Expected service life (years)
              </Label>
              <Input
                id="eq-service-life"
                name="expectedServiceLifeYears"
                type="number"
                min={1}
                max={30}
                value={values.expectedServiceLifeYears}
                onChange={handleLifeYearsChange}
                placeholder="From the manufacturer"
                disabled={disabled}
                className="bg-card border-card-edge text-navy font-semibold text-xs"
              />
              <p className="text-[11px] text-muted font-medium">From the manufacturer</p>
              {fieldErrors.expectedServiceLifeYears && (
                <p className="text-xs font-medium text-destructive">
                  {fieldErrors.expectedServiceLifeYears[0]}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="eq-review-due"
                className="text-xs font-bold uppercase tracking-wider text-muted"
              >
                Replacement review due
              </Label>
              <Input
                id="eq-review-due"
                name="replacementReviewDueOn"
                type="date"
                value={values.replacementReviewDueOn}
                onChange={handleReviewDueChange}
                disabled={disabled}
                className="bg-card border-card-edge text-navy font-semibold text-xs"
              />
              {fieldErrors.replacementReviewDueOn && (
                <p className="text-xs font-medium text-destructive">
                  {fieldErrors.replacementReviewDueOn[0]}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Part 3: Calibration */}
      {hasCalibration && (
        <div className="space-y-3.5 pt-3 border-t border-card-edge">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy tracking-tight">Calibration</h3>
              <p className="text-xs text-muted">
                Regular verification schedule to ensure analytical accuracy.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Label
                htmlFor="switch-calibration"
                className="text-xs font-bold text-navy cursor-pointer"
              >
                Needs calibration
              </Label>
              <Switch
                id="switch-calibration"
                checked={values.needsCalibration}
                onCheckedChange={(checked) =>
                  onChange((prev) => ({ ...prev, needsCalibration: checked }))
                }
                disabled={disabled}
              />
              <input
                type="hidden"
                name="needsCalibration"
                value={values.needsCalibration ? "true" : "false"}
              />
            </div>
          </div>

          {values.needsCalibration && (
            <div className="space-y-3 p-3.5 rounded-xl bg-canvas border border-card-edge">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="eq-calib-interval"
                    className="text-xs font-bold uppercase tracking-wider text-muted"
                  >
                    Interval (days) *
                  </Label>
                  <Input
                    id="eq-calib-interval"
                    name="calibrationIntervalDays"
                    type="number"
                    min={1}
                    max={1095}
                    value={values.calibrationIntervalDays}
                    onChange={handleCalibIntervalChange}
                    placeholder="e.g. 365"
                    disabled={disabled}
                    className="bg-card border-card-edge text-navy font-semibold text-xs"
                  />
                  <p className="text-[11px] text-muted font-medium">
                    Use the interval in the manufacturer&apos;s manual
                  </p>
                  {fieldErrors.calibrationIntervalDays && (
                    <p className="text-xs font-medium text-destructive">
                      {fieldErrors.calibrationIntervalDays[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="eq-calib-next-due"
                    className="text-xs font-bold uppercase tracking-wider text-muted"
                  >
                    Next calibration due *
                  </Label>
                  <Input
                    id="eq-calib-next-due"
                    name="nextCalibrationDueOn"
                    type="date"
                    value={values.nextCalibrationDueOn}
                    onChange={handleCalibDueChange}
                    disabled={disabled}
                    className="bg-card border-card-edge text-navy font-semibold text-xs"
                  />
                  {fieldErrors.nextCalibrationDueOn && (
                    <p className="text-xs font-medium text-destructive">
                      {fieldErrors.nextCalibrationDueOn[0]}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-card-edge">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="eq-last-calibrated"
                    className="text-xs font-bold uppercase tracking-wider text-muted"
                  >
                    Last calibrated on
                  </Label>
                  <Input
                    id="eq-last-calibrated"
                    name="lastCalibratedOn"
                    type="date"
                    value={values.lastCalibratedOn}
                    onChange={handleLastCalibratedOnChange}
                    disabled={disabled}
                    className="bg-card border-card-edge text-navy font-semibold text-xs"
                  />
                  <p className="text-[11px] text-muted font-medium">
                    Leave empty for a brand new instrument
                  </p>
                  {fieldErrors.lastCalibratedOn && (
                    <p className="text-xs font-medium text-destructive">
                      {fieldErrors.lastCalibratedOn[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="eq-calibrated-by"
                    className="text-xs font-bold uppercase tracking-wider text-muted"
                  >
                    Calibrated by
                  </Label>
                  <Input
                    id="eq-calibrated-by"
                    name="calibratedBy"
                    value={values.calibratedBy}
                    onChange={(e) =>
                      onChange((prev) => ({ ...prev, calibratedBy: e.target.value }))
                    }
                    placeholder="Person or service company"
                    disabled={disabled}
                    maxLength={120}
                    className="bg-card border-card-edge text-navy font-semibold text-xs"
                  />
                  <p className="text-[11px] text-muted font-medium">
                    Required if last calibrated is set
                  </p>
                  {fieldErrors.calibratedBy && (
                    <p className="text-xs font-medium text-destructive">
                      {fieldErrors.calibratedBy[0]}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="eq-calib-ref"
                  className="text-xs font-bold uppercase tracking-wider text-muted"
                >
                  Certificate or reference
                </Label>
                <Input
                  id="eq-calib-ref"
                  name="calibrationReference"
                  value={values.calibrationReference}
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, calibrationReference: e.target.value }))
                  }
                  placeholder="e.g. CERT-2026-CAL-042"
                  disabled={disabled}
                  maxLength={120}
                  className="bg-card border-card-edge text-navy font-semibold text-xs"
                />
                {fieldErrors.calibrationReference && (
                  <p className="text-xs font-medium text-destructive">
                    {fieldErrors.calibrationReference[0]}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Part 4: Preventive maintenance */}
      {hasMaintenance && (
        <div className="space-y-3.5 pt-3 border-t border-card-edge">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy tracking-tight">{labels.maintenance}</h3>
              <p className="text-xs text-muted">
                Scheduled servicing to maintain equipment safety and reliability.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Label
                htmlFor="switch-maintenance"
                className="text-xs font-bold text-navy cursor-pointer"
              >
                Needs servicing
              </Label>
              <Switch
                id="switch-maintenance"
                checked={values.needsMaintenance}
                onCheckedChange={(checked) =>
                  onChange((prev) => ({ ...prev, needsMaintenance: checked }))
                }
                disabled={disabled}
              />
              <input
                type="hidden"
                name="needsMaintenance"
                value={values.needsMaintenance ? "true" : "false"}
              />
            </div>
          </div>

          {values.needsMaintenance && (
            <div className="space-y-3 p-3.5 rounded-xl bg-canvas border border-card-edge">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="eq-maint-interval"
                    className="text-xs font-bold uppercase tracking-wider text-muted"
                  >
                    Interval (days) *
                  </Label>
                  <Input
                    id="eq-maint-interval"
                    name="maintenanceIntervalDays"
                    type="number"
                    min={1}
                    max={1095}
                    value={values.maintenanceIntervalDays}
                    onChange={handleMaintIntervalChange}
                    placeholder="e.g. 180"
                    disabled={disabled}
                    className="bg-card border-card-edge text-navy font-semibold text-xs"
                  />
                  <p className="text-[11px] text-muted font-medium">
                    Use the interval in the manufacturer&apos;s manual
                  </p>
                  {fieldErrors.maintenanceIntervalDays && (
                    <p className="text-xs font-medium text-destructive">
                      {fieldErrors.maintenanceIntervalDays[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="eq-maint-next-due"
                    className="text-xs font-bold uppercase tracking-wider text-muted"
                  >
                    Next service due *
                  </Label>
                  <Input
                    id="eq-maint-next-due"
                    name="nextMaintenanceDueOn"
                    type="date"
                    value={values.nextMaintenanceDueOn}
                    onChange={handleMaintDueChange}
                    disabled={disabled}
                    className="bg-card border-card-edge text-navy font-semibold text-xs"
                  />
                  {fieldErrors.nextMaintenanceDueOn && (
                    <p className="text-xs font-medium text-destructive">
                      {fieldErrors.nextMaintenanceDueOn[0]}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-card-edge">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="eq-last-serviced"
                    className="text-xs font-bold uppercase tracking-wider text-muted"
                  >
                    Last serviced on
                  </Label>
                  <Input
                    id="eq-last-serviced"
                    name="lastServicedOn"
                    type="date"
                    value={values.lastServicedOn}
                    onChange={handleLastServicedOnChange}
                    disabled={disabled}
                    className="bg-card border-card-edge text-navy font-semibold text-xs"
                  />
                  {fieldErrors.lastServicedOn && (
                    <p className="text-xs font-medium text-destructive">
                      {fieldErrors.lastServicedOn[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="eq-serviced-by"
                    className="text-xs font-bold uppercase tracking-wider text-muted"
                  >
                    Serviced by
                  </Label>
                  <Input
                    id="eq-serviced-by"
                    name="servicedBy"
                    value={values.servicedBy}
                    onChange={(e) => onChange((prev) => ({ ...prev, servicedBy: e.target.value }))}
                    placeholder="Person or service company"
                    disabled={disabled}
                    maxLength={120}
                    className="bg-card border-card-edge text-navy font-semibold text-xs"
                  />
                  <p className="text-[11px] text-muted font-medium">
                    Required if last serviced is set
                  </p>
                  {fieldErrors.servicedBy && (
                    <p className="text-xs font-medium text-destructive">
                      {fieldErrors.servicedBy[0]}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
