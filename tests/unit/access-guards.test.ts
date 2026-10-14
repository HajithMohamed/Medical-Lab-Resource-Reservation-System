import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Access Guards Unit Test
 *
 * Verifies Constraint C1 ("The server decides: every page and Server Action checks
 * the user and role itself and calls a permissions function. Hidden buttons are only for comfort.")
 *
 * This test statically scans:
 * 1. Every exported Server Action in src/actions/*.ts to ensure it calls requireUser() or requireRole()
 *    (exempting loginAction which must accept unauthenticated visitors).
 * 2. Every page.tsx under src/app/(app) to ensure Server Components enforce authentication
 *    via requireUser() or requireRole() before rendering.
 */
describe("Access guards static verification", () => {
  const rootDir = process.cwd();
  const actionsDir = path.join(rootDir, "src", "actions");
  const appDir = path.join(rootDir, "src", "app", "(app)");

  function getAllFiles(dir: string, ext: string = ".tsx"): string[] {
    let files: string[] = [];
    if (!fs.existsSync(dir)) return files;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        files = files.concat(getAllFiles(fullPath, ext));
      } else if (item.name.endsWith(ext)) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it("every Server Action in src/actions/*.ts (except loginAction) enforces authentication", () => {
    const actionFiles = fs
      .readdirSync(actionsDir)
      .filter((file) => file.endsWith(".ts"))
      .map((file) => path.join(actionsDir, file));

    expect(actionFiles.length).toBeGreaterThan(0);

    for (const filePath of actionFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      // Find all exported async functions
      const functionMatches = content.matchAll(/export\s+async\s+function\s+([a-zA-Z0-9_]+)\s*\(/g);

      for (const match of functionMatches) {
        const fnName = match[1];
        // Named exemptions in auth.ts:
        // - login / loginAction: unauthenticated visitors
        // - logout / changePassword: must work while mustChangePassword is true
        const AUTH_EXEMPT_ACTIONS = ["login", "loginAction", "logout", "changePassword"];
        if (AUTH_EXEMPT_ACTIONS.includes(fnName)) {
          continue;
        }

        const fnStartIndex = match.index!;
        // Grab the function body preview (first 1000 characters or up to next export)
        const fnSnippet = content.slice(fnStartIndex, fnStartIndex + 1000);

        const hasGuard = fnSnippet.includes("requireUser(") || fnSnippet.includes("requireRole(");

        expect(
          hasGuard,
          `Action '${fnName}' in ${path.relative(rootDir, filePath)} must call requireUser() or requireRole()`,
        ).toBe(true);
      }
    }

    // Specific checks for auth.ts actions:
    // changePassword must contain getCurrentUser( and NOT requireUser(
    // (requireUser() redirects users with mustChangePassword: true to /change-password, preventing completion)
    const authActionContent = fs.readFileSync(path.join(actionsDir, "auth.ts"), "utf-8");
    const changePasswordStart = authActionContent.indexOf("export async function changePassword");
    const changePasswordSnippet = authActionContent.slice(changePasswordStart);
    expect(changePasswordSnippet).toContain("getCurrentUser(");
    expect(changePasswordSnippet).not.toContain("requireUser(");

    // logout contains neither requireUser( nor requireRole(
    const logoutStart = authActionContent.indexOf("export async function logout");
    const logoutSnippet = authActionContent.slice(logoutStart, changePasswordStart);
    expect(logoutSnippet).not.toContain("requireUser(");
    expect(logoutSnippet).not.toContain("requireRole(");
  });

  it("every page.tsx in src/app/(app) enforces requireUser() or requireRole()", () => {
    const pageFiles = getAllFiles(appDir, "page.tsx");
    expect(pageFiles.length).toBeGreaterThan(0);

    for (const filePath of pageFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const relativePath = path.relative(rootDir, filePath);

      const hasGuard = content.includes("requireUser(") || content.includes("requireRole(");

      expect(
        hasGuard,
        `Page ${relativePath} must call requireUser() or requireRole() to guard authenticated access (Constraint C1)`,
      ).toBe(true);
    }
  });
});
