import { describe, expect, it, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { resetDatabase, createTestData } from "../helpers/db";
import {
  listSites,
  getSite,
  createSite,
  updateSite,
  deleteSite,
  listSections,
  getSection,
  createSection,
  updateSection,
  deleteSection,
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getSettingsCounts,
  ADMIN_ONLY_ERROR,
} from "@/services/settings";
import { Role } from "@/generated/prisma/client";

describe("Settings Service (Integration)", () => {
  let fixture: Awaited<ReturnType<typeof createTestData>>;
  let adminActor: { id: string; role: Role; siteId: null };
  let managerActor: { id: string; role: Role; siteId: string };
  let staffActor: { id: string; role: Role; siteId: string };

  beforeEach(async () => {
    await resetDatabase();
    fixture = await createTestData();

    const admin = await db.user.create({
      data: {
        name: "Test Admin",
        email: "test.admin@lab.example",
        passwordHash: "test-hash",
        role: Role.ADMIN,
        mustChangePassword: false,
      },
    });

    adminActor = { id: admin.id, role: Role.ADMIN, siteId: null };
    managerActor = {
      id: fixture.managerUser.id,
      role: Role.MANAGER,
      siteId: fixture.site.id,
    };
    staffActor = {
      id: fixture.staffUser.id,
      role: Role.STAFF,
      siteId: fixture.site.id,
    };
  });

  describe("Site Management", () => {
    it("an admin creates, renames and deletes an unused site", async () => {
      // 1. Create
      const createRes = await createSite(adminActor, {
        name: "Unused Branch",
        address: "45 Coast Rd",
      });
      expect(createRes.ok).toBe(true);
      if (!createRes.ok) return;

      const createdSiteId = createRes.data.id;
      expect(createRes.data.name).toBe("Unused Branch");
      expect(createRes.data.address).toBe("45 Coast Rd");
      expect(createRes.message).toBe("Site added");

      // Verify via getSite and listSites
      const fetched = await getSite(adminActor, createdSiteId);
      expect(fetched.ok).toBe(true);
      if (fetched.ok) {
        expect(fetched.data?.name).toBe("Unused Branch");
      }

      const allSites = await listSites(adminActor);
      expect(allSites.ok).toBe(true);
      if (allSites.ok) {
        expect(allSites.data.some((s) => s.id === createdSiteId)).toBe(true);
      }

      // Verify in DB
      const siteInDb = await db.site.findUnique({ where: { id: createdSiteId } });
      expect(siteInDb).not.toBeNull();
      expect(siteInDb?.name).toBe("Unused Branch");

      // 2. Rename / Update
      const updateRes = await updateSite(adminActor, createdSiteId, {
        name: "Renamed Branch",
        address: "50 Coast Rd",
      });
      expect(updateRes.ok).toBe(true);
      if (!updateRes.ok) return;

      expect(updateRes.data.name).toBe("Renamed Branch");
      expect(updateRes.data.address).toBe("50 Coast Rd");
      expect(updateRes.message).toBe("Changes saved");

      // Verify in DB
      const updatedInDb = await db.site.findUnique({ where: { id: createdSiteId } });
      expect(updatedInDb?.name).toBe("Renamed Branch");

      // 3. Delete
      const deleteRes = await deleteSite(adminActor, createdSiteId);
      expect(deleteRes.ok).toBe(true);
      if (!deleteRes.ok) return;
      expect(deleteRes.message).toBe("Site deleted");

      // Verify deleted
      const deletedInDb = await db.site.findUnique({ where: { id: createdSiteId } });
      expect(deletedInDb).toBeNull();
    });

    it("a duplicate name gives the friendly message", async () => {
      // Attempt to create a site with existing fixture name
      const res = await createSite(adminActor, {
        name: "Test Lab",
        address: "Duplicate Address",
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("A site with this name already exists.");
      }

      // Create a second site and attempt to rename it to an existing name
      const secondSite = await createSite(adminActor, {
        name: "Second Site",
      });
      expect(secondSite.ok).toBe(true);
      if (!secondSite.ok) return;

      const renameRes = await updateSite(adminActor, secondSite.data.id, {
        name: "Test Lab",
      });
      expect(renameRes.ok).toBe(false);
      if (!renameRes.ok) {
        expect(renameRes.error).toBe("A site with this name already exists.");
      }
    });

    it("deleting a site that is in use is refused with the counts", async () => {
      // fixture.site is in use by 2 resources and 2 users (staffUser, managerUser)
      const res = await deleteSite(adminActor, fixture.site.id);

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe(
          "This site still has 2 resources and 2 users. Move or retire them first.",
        );
      }

      // Verify site was not deleted
      const siteInDb = await db.site.findUnique({ where: { id: fixture.site.id } });
      expect(siteInDb).not.toBeNull();
    });

    it("a manager and a staff user are refused", async () => {
      // Manager attempts
      const mgrList = await listSites(managerActor);
      expect(mgrList.ok).toBe(false);
      if (!mgrList.ok) expect(mgrList.error).toBe(ADMIN_ONLY_ERROR);

      const mgrCreate = await createSite(managerActor, { name: "Illegal Site" });
      expect(mgrCreate.ok).toBe(false);
      if (!mgrCreate.ok) expect(mgrCreate.error).toBe(ADMIN_ONLY_ERROR);

      const mgrUpdate = await updateSite(managerActor, fixture.site.id, { name: "New Name" });
      expect(mgrUpdate.ok).toBe(false);
      if (!mgrUpdate.ok) expect(mgrUpdate.error).toBe(ADMIN_ONLY_ERROR);

      const mgrDelete = await deleteSite(managerActor, fixture.site.id);
      expect(mgrDelete.ok).toBe(false);
      if (!mgrDelete.ok) expect(mgrDelete.error).toBe(ADMIN_ONLY_ERROR);

      // Staff attempts
      const staffList = await listSites(staffActor);
      expect(staffList.ok).toBe(false);
      if (!staffList.ok) expect(staffList.error).toBe(ADMIN_ONLY_ERROR);

      const staffCreate = await createSite(staffActor, { name: "Illegal Site" });
      expect(staffCreate.ok).toBe(false);
      if (!staffCreate.ok) expect(staffCreate.error).toBe(ADMIN_ONLY_ERROR);

      const staffDelete = await deleteSite(staffActor, fixture.site.id);
      expect(staffDelete.ok).toBe(false);
      if (!staffDelete.ok) expect(staffDelete.error).toBe(ADMIN_ONLY_ERROR);
    });
  });

  describe("Section Management", () => {
    it("an admin creates, renames and deletes an unused section", async () => {
      const createRes = await createSection(adminActor, { name: "Unused Section" });
      expect(createRes.ok).toBe(true);
      if (!createRes.ok) return;

      const sectionId = createRes.data.id;
      expect(createRes.data.name).toBe("Unused Section");

      const fetchedSec = await getSection(adminActor, sectionId);
      expect(fetchedSec.ok).toBe(true);
      if (fetchedSec.ok) {
        expect(fetchedSec.data?.name).toBe("Unused Section");
      }

      const allSecs = await listSections(adminActor);
      expect(allSecs.ok).toBe(true);
      if (allSecs.ok) {
        expect(allSecs.data.some((s) => s.id === sectionId)).toBe(true);
      }

      const updateRes = await updateSection(adminActor, sectionId, {
        name: "Renamed Section",
      });
      expect(updateRes.ok).toBe(true);
      if (!updateRes.ok) return;
      expect(updateRes.data.name).toBe("Renamed Section");

      const deleteRes = await deleteSection(adminActor, sectionId);
      expect(deleteRes.ok).toBe(true);

      const sectionInDb = await db.section.findUnique({ where: { id: sectionId } });
      expect(sectionInDb).toBeNull();
    });

    it("duplicate section name gives friendly error", async () => {
      const res = await createSection(adminActor, { name: "Test Diagnostics" });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("A section with this name already exists.");
      }
    });

    it("deleting an in-use section is refused with counts", async () => {
      // fixture.section is used by 2 resources and 1 user (staffUser)
      const res = await deleteSection(adminActor, fixture.section.id);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe(
          "This section still has 2 resources and 1 user. Move or retire them first.",
        );
      }
    });

    it("manager and staff are refused from section changes", async () => {
      const mgrRes = await createSection(managerActor, { name: "Section M" });
      expect(mgrRes.ok).toBe(false);
      if (!mgrRes.ok) expect(mgrRes.error).toBe(ADMIN_ONLY_ERROR);

      const staffRes = await deleteSection(staffActor, fixture.section.id);
      expect(staffRes.ok).toBe(false);
      if (!staffRes.ok) expect(staffRes.error).toBe(ADMIN_ONLY_ERROR);
    });
  });

  describe("Category Management", () => {
    it("an admin creates, renames and deletes an unused category", async () => {
      const createRes = await createCategory(adminActor, {
        name: "Unused Category",
        maxBookingMinutes: 180,
        iconKey: "microscopy",
      });
      expect(createRes.ok).toBe(true);
      if (!createRes.ok) return;

      const categoryId = createRes.data.id;
      expect(createRes.data.name).toBe("Unused Category");
      expect(createRes.data.maxBookingMinutes).toBe(180);
      expect(createRes.data.iconKey).toBe("microscopy");

      const fetchedCat = await getCategory(adminActor, categoryId);
      expect(fetchedCat.ok).toBe(true);
      if (fetchedCat.ok) {
        expect(fetchedCat.data?.name).toBe("Unused Category");
      }

      const allCats = await listCategories(adminActor);
      expect(allCats.ok).toBe(true);
      if (allCats.ok) {
        expect(allCats.data.some((c) => c.id === categoryId)).toBe(true);
      }

      const updateRes = await updateCategory(adminActor, categoryId, {
        name: "Renamed Category",
        maxBookingMinutes: 300,
        iconKey: "analytical",
      });
      expect(updateRes.ok).toBe(true);
      if (!updateRes.ok) return;
      expect(updateRes.data.name).toBe("Renamed Category");
      expect(updateRes.data.maxBookingMinutes).toBe(300);

      const deleteRes = await deleteCategory(adminActor, categoryId);
      expect(deleteRes.ok).toBe(true);

      const catInDb = await db.category.findUnique({ where: { id: categoryId } });
      expect(catInDb).toBeNull();
    });

    it("duplicate category name gives friendly error", async () => {
      const res = await createCategory(adminActor, {
        name: "Test Instruments",
        maxBookingMinutes: 240,
        iconKey: "other",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("A category with this name already exists.");
      }
    });

    it("deleting an in-use category is refused with resource count", async () => {
      // fixture.category has 2 resources
      const res = await deleteCategory(adminActor, fixture.category.id);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe("This category still has 2 resources. Move or retire them first.");
      }
    });

    it("validates maxBookingMinutes rules", async () => {
      // Not a multiple of 15
      const invalidMultiple = await createCategory(adminActor, {
        name: "Invalid Slot Cat",
        maxBookingMinutes: 250,
        iconKey: "other",
      });
      expect(invalidMultiple.ok).toBe(false);
      if (!invalidMultiple.ok) {
        expect(invalidMultiple.error).toBe("Limit must be a multiple of 15 minutes.");
      }

      // Below 15
      const tooLow = await createCategory(adminActor, {
        name: "Too Low Cat",
        maxBookingMinutes: 14,
        iconKey: "other",
      });
      expect(tooLow.ok).toBe(false);
      if (!tooLow.ok) {
        expect(tooLow.error).toBe("Limit must be at least 15 minutes.");
      }

      // Exceeds 10080
      const tooHigh = await createCategory(adminActor, {
        name: "Too High Cat",
        maxBookingMinutes: 10095,
        iconKey: "other",
      });
      expect(tooHigh.ok).toBe(false);
      if (!tooHigh.ok) {
        expect(tooHigh.error).toBe("Limit cannot exceed 10080 minutes.");
      }
    });

    it("manager and staff are refused from category changes", async () => {
      const mgrRes = await createCategory(managerActor, {
        name: "Mgr Cat",
        maxBookingMinutes: 60,
        iconKey: "room",
      });
      expect(mgrRes.ok).toBe(false);
      if (!mgrRes.ok) expect(mgrRes.error).toBe(ADMIN_ONLY_ERROR);
    });
  });

  describe("Overview Counts", () => {
    it("returns correct overview counts to admin and refuses non-admins", async () => {
      const countsRes = await getSettingsCounts(adminActor);
      expect(countsRes.ok).toBe(true);
      if (countsRes.ok) {
        expect(countsRes.data.sitesCount).toBe(1);
        expect(countsRes.data.sectionsCount).toBe(1);
        expect(countsRes.data.categoriesCount).toBe(1);
      }

      const mgrRes = await getSettingsCounts(managerActor);
      expect(mgrRes.ok).toBe(false);
    });
  });
});
