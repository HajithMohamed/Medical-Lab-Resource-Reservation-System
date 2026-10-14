import "server-only";

import { z } from "zod";
import { db } from "@/lib/db";
import { isAdmin, type UserLike } from "@/lib/permissions";
import { isUniqueError, isForeignKeyError } from "@/lib/db-errors";
import { checkCategoryLimit } from "@/lib/booking-rules";
import { CATEGORY_ICON_KEYS } from "@/config/category-icons";

export const ADMIN_ONLY_ERROR = "Only admins can change settings.";

export type ServiceResult<T = void> =
  | { ok: true; data: T; message?: string; totalCount?: number; totalPages?: number }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export interface SettingsPaginationOptions {
  page?: number;
  pageSize?: number;
}

// Validation schemas
export const createSiteSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name cannot exceed 80 characters."),
  address: z
    .string()
    .trim()
    .max(200, "Address cannot exceed 200 characters.")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export const updateSiteSchema = createSiteSchema;

export const createSectionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name cannot exceed 80 characters."),
});

export const updateSectionSchema = createSectionSchema;

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name cannot exceed 80 characters."),
  maxBookingMinutes: z.number().int("Limit must be a whole number of minutes."),
  iconKey: z.enum(CATEGORY_ICON_KEYS, {
    message: "Icon must be a valid category icon.",
  }),
});

export const updateCategorySchema = createCategorySchema;

export type CreateSiteInput = z.infer<typeof createSiteSchema>;
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export interface SiteWithCounts {
  id: string;
  name: string;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    resources: number;
    users: number;
  };
}

export interface SectionWithCounts {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    resources: number;
    users: number;
  };
}

export interface CategoryWithCounts {
  id: string;
  name: string;
  maxBookingMinutes: number;
  iconKey: string;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    resources: number;
  };
}

export interface SettingsOverviewCounts {
  sitesCount: number;
  sectionsCount: number;
  categoriesCount: number;
}

// ==========================================
// Overview & Hub
// ==========================================

export async function getSettingsCounts(
  actor: UserLike,
): Promise<ServiceResult<SettingsOverviewCounts>> {
  if (!isAdmin(actor)) {
    return { ok: false, error: ADMIN_ONLY_ERROR };
  }

  const [sitesCount, sectionsCount, categoriesCount] = await Promise.all([
    db.site.count(),
    db.section.count(),
    db.category.count(),
  ]);

  return {
    ok: true,
    data: {
      sitesCount,
      sectionsCount,
      categoriesCount,
    },
  };
}

// ==========================================
// Sites
// ==========================================

export async function listSites(
  actor: UserLike,
  options?: SettingsPaginationOptions,
): Promise<ServiceResult<SiteWithCounts[]>> {
  if (!isAdmin(actor)) {
    return { ok: false, error: ADMIN_ONLY_ERROR };
  }

  const shouldPaginate = options?.page !== undefined || options?.pageSize !== undefined;
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.max(1, options?.pageSize ?? 10);

  const totalCount = await db.site.count();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const sites = await db.site.findMany({
    orderBy: { name: "asc" },
    skip: shouldPaginate ? (page - 1) * pageSize : undefined,
    take: shouldPaginate ? pageSize : undefined,
    include: {
      _count: {
        select: {
          resources: true,
          users: true,
        },
      },
    },
  });

  return { ok: true, data: sites, totalCount, totalPages };
}

export async function getSite(
  actor: UserLike,
  id: string,
): Promise<ServiceResult<SiteWithCounts | null>> {
  if (!isAdmin(actor)) {
    return { ok: false, error: ADMIN_ONLY_ERROR };
  }

  const site = await db.site.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          resources: true,
          users: true,
        },
      },
    },
  });

  if (!site) {
    return { ok: false, error: "Site not found." };
  }

  return { ok: true, data: site };
}

export async function createSite(
  actor: UserLike,
  rawInput: unknown,
): Promise<ServiceResult<SiteWithCounts>> {
  if (!isAdmin(actor)) {
    return { ok: false, error: ADMIN_ONLY_ERROR };
  }

  const parsed = createSiteSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid site data.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const site = await db.site.create({
      data: parsed.data,
      include: {
        _count: {
          select: {
            resources: true,
            users: true,
          },
        },
      },
    });
    return { ok: true, data: site, message: "Site added" };
  } catch (error) {
    if (isUniqueError(error)) {
      return { ok: false, error: "A site with this name already exists." };
    }
    throw error;
  }
}

export async function updateSite(
  actor: UserLike,
  id: string,
  rawInput: unknown,
): Promise<ServiceResult<SiteWithCounts>> {
  if (!isAdmin(actor)) {
    return { ok: false, error: ADMIN_ONLY_ERROR };
  }

  const parsed = updateSiteSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid site data.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const site = await db.site.update({
      where: { id },
      data: parsed.data,
      include: {
        _count: {
          select: {
            resources: true,
            users: true,
          },
        },
      },
    });
    return { ok: true, data: site, message: "Changes saved" };
  } catch (error) {
    if (isUniqueError(error)) {
      return { ok: false, error: "A site with this name already exists." };
    }
    throw error;
  }
}

export async function deleteSite(actor: UserLike, id: string): Promise<ServiceResult> {
  if (!isAdmin(actor)) {
    return { ok: false, error: ADMIN_ONLY_ERROR };
  }

  const [resCount, userCount] = await Promise.all([
    db.resource.count({ where: { siteId: id } }),
    db.user.count({ where: { siteId: id } }),
  ]);

  if (resCount > 0 || userCount > 0) {
    let message = "";
    if (resCount > 0 && userCount > 0) {
      message = `This site still has ${resCount} resource${resCount === 1 ? "" : "s"} and ${userCount} user${userCount === 1 ? "" : "s"}. Move or retire them first.`;
    } else if (resCount > 0) {
      message = `This site still has ${resCount} resource${resCount === 1 ? "" : "s"}. Move or retire them first.`;
    } else {
      message = `This site still has ${userCount} user${userCount === 1 ? "" : "s"}. Move or retire them first.`;
    }
    return { ok: false, error: message };
  }

  try {
    await db.site.delete({ where: { id } });
    return { ok: true, data: undefined, message: "Site deleted" };
  } catch (error) {
    if (isForeignKeyError(error)) {
      return {
        ok: false,
        error: "This site cannot be deleted because it is still in use.",
      };
    }
    throw error;
  }
}

// ==========================================
// Sections
// ==========================================

export async function listSections(
  actor: UserLike,
  options?: SettingsPaginationOptions,
): Promise<ServiceResult<SectionWithCounts[]>> {
  if (!isAdmin(actor)) {
    return { ok: false, error: ADMIN_ONLY_ERROR };
  }

  const shouldPaginate = options?.page !== undefined || options?.pageSize !== undefined;
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.max(1, options?.pageSize ?? 10);

  const totalCount = await db.section.count();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const sections = await db.section.findMany({
    orderBy: { name: "asc" },
    skip: shouldPaginate ? (page - 1) * pageSize : undefined,
    take: shouldPaginate ? pageSize : undefined,
    include: {
      _count: {
        select: {
          resources: true,
          users: true,
        },
      },
    },
  });

  return { ok: true, data: sections, totalCount, totalPages };
}

export async function getSection(
  actor: UserLike,
  id: string,
): Promise<ServiceResult<SectionWithCounts | null>> {
  if (!isAdmin(actor)) {
    return { ok: false, error: ADMIN_ONLY_ERROR };
  }

  const section = await db.section.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          resources: true,
          users: true,
        },
      },
    },
  });

  if (!section) {
    return { ok: false, error: "Section not found." };
  }

  return { ok: true, data: section };
}

export async function createSection(
  actor: UserLike,
  rawInput: unknown,
): Promise<ServiceResult<SectionWithCounts>> {
  if (!isAdmin(actor)) {
    return { ok: false, error: ADMIN_ONLY_ERROR };
  }

  const parsed = createSectionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid section data.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const section = await db.section.create({
      data: parsed.data,
      include: {
        _count: {
          select: {
            resources: true,
            users: true,
          },
        },
      },
    });
    return { ok: true, data: section, message: "Section added" };
  } catch (error) {
    if (isUniqueError(error)) {
      return { ok: false, error: "A section with this name already exists." };
    }
    throw error;
  }
}

export async function updateSection(
  actor: UserLike,
  id: string,
  rawInput: unknown,
): Promise<ServiceResult<SectionWithCounts>> {
  if (!isAdmin(actor)) {
    return { ok: false, error: ADMIN_ONLY_ERROR };
  }

  const parsed = updateSectionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid section data.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const section = await db.section.update({
      where: { id },
      data: parsed.data,
      include: {
        _count: {
          select: {
            resources: true,
            users: true,
          },
        },
      },
    });
    return { ok: true, data: section, message: "Changes saved" };
  } catch (error) {
    if (isUniqueError(error)) {
      return { ok: false, error: "A section with this name already exists." };
    }
    throw error;
  }
}

export async function deleteSection(actor: UserLike, id: string): Promise<ServiceResult> {
  if (!isAdmin(actor)) {
    return { ok: false, error: ADMIN_ONLY_ERROR };
  }

  const [resCount, userCount] = await Promise.all([
    db.resource.count({ where: { sectionId: id } }),
    db.user.count({ where: { sectionId: id } }),
  ]);

  if (resCount > 0 || userCount > 0) {
    let message = "";
    if (resCount > 0 && userCount > 0) {
      message = `This section still has ${resCount} resource${resCount === 1 ? "" : "s"} and ${userCount} user${userCount === 1 ? "" : "s"}. Move or retire them first.`;
    } else if (resCount > 0) {
      message = `This section still has ${resCount} resource${resCount === 1 ? "" : "s"}. Move or retire them first.`;
    } else {
      message = `This section still has ${userCount} user${userCount === 1 ? "" : "s"}. Move or retire them first.`;
    }
    return { ok: false, error: message };
  }

  try {
    await db.section.delete({ where: { id } });
    return { ok: true, data: undefined, message: "Section deleted" };
  } catch (error) {
    if (isForeignKeyError(error)) {
      return {
        ok: false,
        error: "This section cannot be deleted because it is still in use.",
      };
    }
    throw error;
  }
}

// ==========================================
// Categories
// ==========================================

export async function listCategories(
  actor: UserLike,
  options?: SettingsPaginationOptions,
): Promise<ServiceResult<CategoryWithCounts[]>> {
  if (!isAdmin(actor)) {
    return { ok: false, error: ADMIN_ONLY_ERROR };
  }

  const shouldPaginate = options?.page !== undefined || options?.pageSize !== undefined;
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.max(1, options?.pageSize ?? 10);

  const totalCount = await db.category.count();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    skip: shouldPaginate ? (page - 1) * pageSize : undefined,
    take: shouldPaginate ? pageSize : undefined,
    include: {
      _count: {
        select: {
          resources: true,
        },
      },
    },
  });

  return { ok: true, data: categories, totalCount, totalPages };
}

export async function getCategory(
  actor: UserLike,
  id: string,
): Promise<ServiceResult<CategoryWithCounts | null>> {
  if (!isAdmin(actor)) {
    return { ok: false, error: ADMIN_ONLY_ERROR };
  }

  const category = await db.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          resources: true,
        },
      },
    },
  });

  if (!category) {
    return { ok: false, error: "Category not found." };
  }

  return { ok: true, data: category };
}

export async function createCategory(
  actor: UserLike,
  rawInput: unknown,
): Promise<ServiceResult<CategoryWithCounts>> {
  if (!isAdmin(actor)) {
    return { ok: false, error: ADMIN_ONLY_ERROR };
  }

  const parsed = createCategorySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid category data.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const limitError = checkCategoryLimit(parsed.data.maxBookingMinutes);
  if (limitError) {
    return {
      ok: false,
      error: limitError,
      fieldErrors: { maxBookingMinutes: [limitError] },
    };
  }

  try {
    const category = await db.category.create({
      data: {
        name: parsed.data.name,
        maxBookingMinutes: parsed.data.maxBookingMinutes,
        iconKey: parsed.data.iconKey,
      },
      include: {
        _count: {
          select: {
            resources: true,
          },
        },
      },
    });
    return { ok: true, data: category, message: "Category added" };
  } catch (error) {
    if (isUniqueError(error)) {
      return { ok: false, error: "A category with this name already exists." };
    }
    throw error;
  }
}

export async function updateCategory(
  actor: UserLike,
  id: string,
  rawInput: unknown,
): Promise<ServiceResult<CategoryWithCounts>> {
  if (!isAdmin(actor)) {
    return { ok: false, error: ADMIN_ONLY_ERROR };
  }

  const parsed = updateCategorySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid category data.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const limitError = checkCategoryLimit(parsed.data.maxBookingMinutes);
  if (limitError) {
    return {
      ok: false,
      error: limitError,
      fieldErrors: { maxBookingMinutes: [limitError] },
    };
  }

  try {
    const category = await db.category.update({
      where: { id },
      data: {
        name: parsed.data.name,
        maxBookingMinutes: parsed.data.maxBookingMinutes,
        iconKey: parsed.data.iconKey,
      },
      include: {
        _count: {
          select: {
            resources: true,
          },
        },
      },
    });
    return { ok: true, data: category, message: "Changes saved" };
  } catch (error) {
    if (isUniqueError(error)) {
      return { ok: false, error: "A category with this name already exists." };
    }
    throw error;
  }
}

export async function deleteCategory(actor: UserLike, id: string): Promise<ServiceResult> {
  if (!isAdmin(actor)) {
    return { ok: false, error: ADMIN_ONLY_ERROR };
  }

  const resCount = await db.resource.count({ where: { categoryId: id } });
  if (resCount > 0) {
    return {
      ok: false,
      error: `This category still has ${resCount} resource${resCount === 1 ? "" : "s"}. Move or retire them first.`,
    };
  }

  try {
    await db.category.delete({ where: { id } });
    return { ok: true, data: undefined, message: "Category deleted" };
  } catch (error) {
    if (isForeignKeyError(error)) {
      return {
        ok: false,
        error: "This category cannot be deleted because it is still in use.",
      };
    }
    throw error;
  }
}
