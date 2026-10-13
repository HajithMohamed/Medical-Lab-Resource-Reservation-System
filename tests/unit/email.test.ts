import { describe, expect, it } from "vitest";
import {
  buildChangePasswordUrl,
  renderWelcomeEmailHtml,
  renderWelcomeEmailText,
  renderPasswordResetEmailHtml,
  renderPasswordResetEmailText,
  sendUserWelcomeEmail,
} from "@/lib/email";
import { APP_NAME } from "@/config/brand";

describe("Email Service & Templates", () => {
  const sampleParams = {
    name: "Dr. Kasun Silva <Researcher>",
    email: "kasun.silva@lab.example",
    temporaryPassword: "K4s-992-XyZ#12",
    role: "STAFF",
    siteName: "Colombo Pathology Lab",
    changePasswordUrl: "http://localhost:3000/change-password?email=kasun.silva%40lab.example",
  };

  describe("buildChangePasswordUrl", () => {
    it("encodes the email query parameter properly into the change password route", () => {
      const url = buildChangePasswordUrl("test+user@domain.com");
      expect(url).toContain("/change-password?email=test%2Buser%40domain.com");
    });
  });

  describe("renderWelcomeEmailHtml", () => {
    it("renders rich HTML containing name, email, credentials, and change password url", () => {
      const html = renderWelcomeEmailHtml(sampleParams);

      expect(html).toContain(APP_NAME);
      expect(html).toContain("kasun.silva@lab.example");
      expect(html).toContain("K4s-992-XyZ#12");
      expect(html).toContain("STAFF");
      expect(html).toContain("Colombo Pathology Lab");
      expect(html).toContain(
        "http://localhost:3000/change-password?email=kasun.silva%40lab.example",
      );
      // HTML escaping check
      expect(html).toContain("&lt;Researcher&gt;");
      expect(html).not.toContain("<Researcher>");
      // Security warning check
      expect(html).toContain("Security Policy Requirement");
      expect(html).toContain("Sign In &amp; Change Password");
    });
  });

  describe("renderWelcomeEmailText", () => {
    it("renders plain-text fallback containing password and change password URL", () => {
      const text = renderWelcomeEmailText(sampleParams);

      expect(text).toContain("Dr. Kasun Silva <Researcher>");
      expect(text).toContain("kasun.silva@lab.example");
      expect(text).toContain("K4s-992-XyZ#12");
      expect(text).toContain(sampleParams.changePasswordUrl);
      expect(text).toContain("CHANGE PASSWORD & SIGN IN");
    });
  });

  describe("renderPasswordResetEmailHtml", () => {
    it("renders password reset email containing new temporary password and link", () => {
      const html = renderPasswordResetEmailHtml({
        name: "Kasun Silva",
        email: "kasun@lab.example",
        temporaryPassword: "Rst-888-P@ss!9",
        changePasswordUrl: "http://localhost:3000/change-password?email=kasun%40lab.example",
      });

      expect(html).toContain("Kasun Silva");
      expect(html).toContain("Rst-888-P@ss!9");
      expect(html).toContain("http://localhost:3000/change-password?email=kasun%40lab.example");
      expect(html).toContain("Sign In &amp; Set New Password");
    });
  });

  describe("renderPasswordResetEmailText", () => {
    it("renders plain-text reset email properly", () => {
      const text = renderPasswordResetEmailText({
        name: "Kasun Silva",
        email: "kasun@lab.example",
        temporaryPassword: "Rst-888-P@ss!9",
        changePasswordUrl: "http://localhost:3000/change-password?email=kasun%40lab.example",
      });

      expect(text).toContain("Kasun Silva");
      expect(text).toContain("Rst-888-P@ss!9");
      expect(text).toContain("http://localhost:3000/change-password?email=kasun%40lab.example");
    });
  });

  describe("sendUserWelcomeEmail without API key", () => {
    it("returns ok: false with informative message instead of throwing an error", async () => {
      const res = await sendUserWelcomeEmail({
        to: "recipient@lab.example",
        name: "Tester",
        temporaryPassword: "Test-temp-password-123",
      });

      expect(res.ok).toBe(false);
      expect(res.error).toBeDefined();
    });
  });
});
