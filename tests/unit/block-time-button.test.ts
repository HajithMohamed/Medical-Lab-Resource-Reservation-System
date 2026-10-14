import { describe, expect, it } from "vitest";
import {
  BlockTimeButton,
  HAS_MAINTENANCE_NEW_ROUTE,
} from "@/components/equipment/block-time-button";
import type { UserLike, ResourceLike } from "@/lib/permissions";

describe("BlockTimeButton component", () => {
  const staff: UserLike = {
    id: "usr-staff",
    role: "STAFF",
    siteId: "site-colombo",
  };

  const managerColombo: UserLike = {
    id: "usr-mgr-colombo",
    role: "MANAGER",
    siteId: "site-colombo",
  };

  const managerKandy: UserLike = {
    id: "usr-mgr-kandy",
    role: "MANAGER",
    siteId: "site-kandy",
  };

  const admin: UserLike = {
    id: "usr-admin",
    role: "ADMIN",
  };

  const resourceColombo: ResourceLike = {
    id: "res-bio-1",
    siteId: "site-colombo",
  };

  it("does not render when /maintenance/new route does not exist", () => {
    expect(HAS_MAINTENANCE_NEW_ROUTE).toBe(false);

    // Even for admin and manager, returns null when route does not exist
    const adminElement = BlockTimeButton({
      actor: admin,
      resource: resourceColombo,
      reason: "Calibration",
    });
    expect(adminElement).toBeNull();

    const managerElement = BlockTimeButton({
      actor: managerColombo,
      resource: resourceColombo,
      reason: "Service",
    });
    expect(managerElement).toBeNull();
  });

  describe("when route is enabled", () => {
    it("does not render for STAFF (canManageMaintenance is false)", () => {
      const el = BlockTimeButton({
        actor: staff,
        resource: resourceColombo,
        enabled: true,
      });
      expect(el).toBeNull();
    });

    it("does not render for MANAGER of a different site", () => {
      const el = BlockTimeButton({
        actor: managerKandy,
        resource: resourceColombo,
        enabled: true,
      });
      expect(el).toBeNull();
    });

    it("renders secondary button linking to Calibration for site MANAGER", () => {
      const el = BlockTimeButton({
        actor: managerColombo,
        resource: resourceColombo,
        reason: "Calibration",
        enabled: true,
      });

      expect(el).not.toBeNull();
      expect(el?.props.variant).toBe("secondary");
      expect(el?.props.asChild).toBe(true);

      const link = el?.props.children;
      expect(link.props.href).toBe("/maintenance/new?resourceId=res-bio-1&reason=Calibration");
      expect(link.props.children).toBe("Block time");
    });

    it("renders secondary button linking to Service for ADMIN on any site resource", () => {
      const el = BlockTimeButton({
        actor: admin,
        resource: resourceColombo,
        reason: "Service",
        enabled: true,
      });

      expect(el).not.toBeNull();
      expect(el?.props.variant).toBe("secondary");
      expect(el?.props.asChild).toBe(true);

      const link = el?.props.children;
      expect(link.props.href).toBe("/maintenance/new?resourceId=res-bio-1&reason=Service");
      expect(link.props.children).toBe("Block time");
    });
  });
});
