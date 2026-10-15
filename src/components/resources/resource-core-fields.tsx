"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ResourceCoreFieldsProps {
  idPrefix?: string;
  name: string;
  setName: (val: string) => void;
  siteId: string;
  setSiteId: (val: string) => void;
  categoryId: string;
  setCategoryId: (val: string) => void;
  sectionId: string;
  setSectionId: (val: string) => void;
  location: string;
  setLocation: (val: string) => void;
  capacity: string;
  setCapacity: (val: string) => void;
  isManager: boolean;
  actorSiteId: string | null;
  currentSiteName: string;
  sites: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; maxBookingMinutes: number; iconKey: string }>;
  sections: Array<{ id: string; name: string }>;
  fieldErrors?: Record<string, string[]>;
  disabled?: boolean;
}

export function ResourceCoreFields({
  idPrefix = "resource",
  name,
  setName,
  siteId,
  setSiteId,
  categoryId,
  setCategoryId,
  sectionId,
  setSectionId,
  location,
  setLocation,
  capacity,
  setCapacity,
  isManager,
  actorSiteId,
  currentSiteName,
  sites,
  categories,
  sections,
  fieldErrors = {},
  disabled = false,
}: ResourceCoreFieldsProps) {
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isRoom = selectedCategory?.iconKey === "room";

  return (
    <div className="space-y-3.5">
      {/* Resource Name */}
      <div className="space-y-1.5">
        <Label
          htmlFor={`${idPrefix}-name`}
          className="text-xs font-bold text-navy uppercase tracking-wider"
        >
          Resource name
        </Label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Real-time PCR machine 1"
          required
          minLength={2}
          maxLength={80}
          disabled={disabled}
          className="h-10 rounded-xl border-card-edge bg-card text-navy font-semibold text-sm"
        />
        {fieldErrors.name && (
          <p className="text-xs font-medium text-destructive">{fieldErrors.name[0]}</p>
        )}
      </div>

      {/* Laboratory Site */}
      <div className="space-y-1.5">
        <Label
          htmlFor={`${idPrefix}-site`}
          className="text-xs font-bold text-navy uppercase tracking-wider"
        >
          Laboratory site
        </Label>
        {isManager ? (
          <div>
            <Input
              id={`${idPrefix}-site`}
              value={currentSiteName}
              disabled
              className="h-10 rounded-xl bg-canvas border-card-edge text-muted font-semibold text-sm"
            />
            <input type="hidden" name="siteId" value={actorSiteId ?? ""} />
            <p className="text-xs text-muted mt-1 font-medium">
              Site managers may only manage resources for their assigned laboratory.
            </p>
          </div>
        ) : (
          <select
            id={`${idPrefix}-site`}
            name="siteId"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            disabled={disabled}
            required
            className="h-10 w-full rounded-xl border border-card-edge bg-card px-3 text-sm font-semibold text-navy focus:border-teal focus:outline-none cursor-pointer transition-colors"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        {fieldErrors.siteId && (
          <p className="text-xs font-medium text-destructive">{fieldErrors.siteId[0]}</p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label
          htmlFor={`${idPrefix}-category`}
          className="text-xs font-bold text-navy uppercase tracking-wider"
        >
          Category
        </Label>
        <select
          id={`${idPrefix}-category`}
          name="categoryId"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={disabled}
          required
          className="h-10 w-full rounded-xl border border-card-edge bg-card px-3 text-sm font-semibold text-navy focus:border-teal focus:outline-none cursor-pointer transition-colors"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {fieldErrors.categoryId && (
          <p className="text-xs font-medium text-destructive">{fieldErrors.categoryId[0]}</p>
        )}
      </div>

      {/* Section */}
      <div className="space-y-1.5">
        <Label
          htmlFor={`${idPrefix}-section`}
          className="text-xs font-bold text-navy uppercase tracking-wider"
        >
          Owning section
        </Label>
        <select
          id={`${idPrefix}-section`}
          name="sectionId"
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          disabled={disabled}
          required
          className="h-10 w-full rounded-xl border border-card-edge bg-card px-3 text-sm font-semibold text-navy focus:border-teal focus:outline-none cursor-pointer transition-colors"
        >
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {fieldErrors.sectionId && (
          <p className="text-xs font-medium text-destructive">{fieldErrors.sectionId[0]}</p>
        )}
      </div>

      {/* Physical Location */}
      <div className="space-y-1.5">
        <Label
          htmlFor={`${idPrefix}-location`}
          className="text-xs font-bold text-navy uppercase tracking-wider"
        >
          Physical location
        </Label>
        <Input
          id={`${idPrefix}-location`}
          name="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Room 204, East Wing Bench 3"
          maxLength={120}
          disabled={disabled}
          className="h-10 rounded-xl border-card-edge bg-card text-navy font-semibold text-sm"
        />
        {fieldErrors.location && (
          <p className="text-xs font-medium text-destructive">{fieldErrors.location[0]}</p>
        )}
      </div>

      {/* Seating Capacity (Rooms only) */}
      {isRoom && (
        <div className="space-y-1.5">
          <Label
            htmlFor={`${idPrefix}-capacity`}
            className="text-xs font-bold text-navy uppercase tracking-wider"
          >
            Seating capacity
          </Label>
          <Input
            id={`${idPrefix}-capacity`}
            name="capacity"
            type="number"
            min={1}
            max={500}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="e.g. 20"
            disabled={disabled}
            className="h-10 rounded-xl border-card-edge bg-card text-navy font-semibold text-sm"
          />
          <p className="text-xs text-muted font-medium">
            Rooms require attendee limits for laboratory safety and seating control.
          </p>
          {fieldErrors.capacity && (
            <p className="text-xs font-medium text-destructive">{fieldErrors.capacity[0]}</p>
          )}
        </div>
      )}
    </div>
  );
}
