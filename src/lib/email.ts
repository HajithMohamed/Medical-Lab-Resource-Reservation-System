import "server-only";

import { Resend } from "resend";
import { env } from "@/lib/env";
import { APP_NAME, APP_TAGLINE, BRAND_COLORS } from "@/config/brand";

export interface WelcomeEmailParams {
  to: string;
  name: string;
  temporaryPassword: string;
  role?: string;
  siteName?: string | null;
}

export interface PasswordResetEmailParams {
  to: string;
  name: string;
  temporaryPassword: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * Escapes HTML characters to prevent XSS / formatting corruption in email clients.
 */
import fs from "node:fs";
import path from "node:path";

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Resolves the Resend API key with runtime fallbacks to disk (.env / .env.local).
 * This ensures that when developers paste keys into .env without restarting next dev,
 * the key is picked up immediately.
 */
export function resolveApiKey(): string | undefined {
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== "") {
    const key = process.env.RESEND_API_KEY.trim();
    if (!key.startsWith("replace-with")) return key;
  }

  if (env.RESEND_API_KEY && env.RESEND_API_KEY.trim() !== "") {
    const key = env.RESEND_API_KEY.trim();
    if (!key.startsWith("replace-with")) return key;
  }

  try {
    const cwd = process.cwd();
    for (const file of [".env.local", ".env.development.local", ".env"]) {
      const filePath = path.join(/*turbopackIgnore: true*/ cwd, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const match = content.match(/^RESEND_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/m);
        if (match && match[1] && match[1].trim() !== "") {
          const key = match[1].trim();
          if (!key.startsWith("replace-with")) {
            process.env.RESEND_API_KEY = key;
            return key;
          }
        }
      }
    }
  } catch {
    // ignore disk read errors
  }

  return undefined;
}

/**
 * Resolves the Resend client if a valid API key is present.
 */
function getResendClient(): Resend | null {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

/**
 * Resolves the base application URL for deep-links in emails.
 */
function getAppBaseUrl(): string {
  const url =
    process.env.APP_BASE_URL ||
    env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

/**
 * Builds the URL to the change-password screen with prefilled email.
 */
export function buildChangePasswordUrl(email: string): string {
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}/change-password?email=${encodeURIComponent(email)}`;
}

/**
 * Generates an email client-safe, modern responsive HTML template for account welcome.
 */
export function renderWelcomeEmailHtml(params: {
  name: string;
  email: string;
  temporaryPassword: string;
  role?: string;
  siteName?: string | null;
  changePasswordUrl: string;
}): string {
  const safeName = escapeHtml(params.name);
  const safeEmail = escapeHtml(params.email);
  const safePassword = escapeHtml(params.temporaryPassword);
  const safeRole = params.role ? escapeHtml(params.role) : null;
  const safeSite = params.siteName ? escapeHtml(params.siteName) : null;
  const safeUrl = escapeHtml(params.changePasswordUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${escapeHtml(APP_NAME)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; margin: 0 !important; }
      .email-content { padding: 24px 20px !important; }
      .email-header { padding: 24px 20px !important; }
      .pwd-box { font-size: 19px !important; letter-spacing: 2px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; color: #1e293b;">
  <!-- Preview Text -->
  <div style="display: none; font-size: 1px; color: #f1f5f9; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Your ${escapeHtml(APP_NAME)} account is ready. Sign in with your temporary credentials and set your new password.
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td class="email-header" style="background-color: ${BRAND_COLORS.navy}; background-image: linear-gradient(135deg, ${BRAND_COLORS.navy} 0%, ${BRAND_COLORS.teal} 100%); padding: 32px 36px; text-align: left;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="display: inline-block; vertical-align: middle; width: 38px; height: 38px; border-radius: 10px; background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); text-align: center; line-height: 38px; margin-right: 12px;">
                      <span style="font-size: 20px; color: #ffffff; font-weight: bold; line-height: 38px;">&#x271A;</span>
                    </div>
                    <div style="display: inline-block; vertical-align: middle;">
                      <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px; line-height: 1.1;">
                        ${escapeHtml(APP_NAME)}
                      </div>
                      <div style="font-size: 11px; font-weight: 700; color: #a5f3fc; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 3px;">
                        ${escapeHtml(APP_TAGLINE)}
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td class="email-content" style="padding: 36px 36px 28px 36px;">
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: ${BRAND_COLORS.navy}; letter-spacing: -0.4px;">
                Welcome to ${escapeHtml(APP_NAME)}, ${safeName}!
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                Your laboratory account has been created. You can now log in to reserve lab equipment, manage bench time slots, and collaborate with your medical laboratory team.
              </p>

              <!-- Credentials Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 22px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #64748b; margin-bottom: 14px;">
                      Your Sign-In Credentials
                    </div>

                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 10px; font-size: 14px; color: #64748b; width: 120px;">
                          Email Address:
                        </td>
                        <td style="padding-bottom: 10px; font-size: 14px; font-weight: 600; color: #0f172a;">
                          ${safeEmail}
                        </td>
                      </tr>

                      ${
                        safeRole
                          ? `<tr>
                        <td style="padding-bottom: 10px; font-size: 14px; color: #64748b;">
                          Assigned Role:
                        </td>
                        <td style="padding-bottom: 10px; font-size: 14px; font-weight: 600; color: #0f172a;">
                          ${safeRole}
                        </td>
                      </tr>`
                          : ""
                      }

                      ${
                        safeSite
                          ? `<tr>
                        <td style="padding-bottom: 10px; font-size: 14px; color: #64748b;">
                          Laboratory Site:
                        </td>
                        <td style="padding-bottom: 10px; font-size: 14px; font-weight: 600; color: #0f172a;">
                          ${safeSite}
                        </td>
                      </tr>`
                          : ""
                      }

                      <tr>
                        <td colspan="2" style="padding-top: 10px; padding-bottom: 6px;">
                          <div style="font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px;">
                            Temporary Password:
                          </div>
                          <div class="pwd-box" style="background-color: #ffffff; border: 2px dashed #94a3b8; border-radius: 8px; padding: 14px 18px; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 22px; font-weight: 800; letter-spacing: 3px; color: ${BRAND_COLORS.navy};">
                            ${safePassword}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${safeUrl}" target="_blank" style="display: inline-block; background-color: ${BRAND_COLORS.teal}; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 10px; box-shadow: 0 4px 12px rgba(14, 106, 133, 0.25);">
                      Sign In &amp; Change Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #eff6ff; border-left: 4px solid #0284c7; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 18px;">
                    <div style="font-size: 13px; font-weight: 700; color: #0369a1; margin-bottom: 4px;">
                      &#x1F512; Security Policy Requirement
                    </div>
                    <div style="font-size: 13px; line-height: 1.5; color: #1e40af;">
                      For laboratory security and NIST compliance, you must choose your personal password upon your first sign in. Never share your credentials with anyone.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Direct URL Fallback -->
              <div style="font-size: 12.5px; line-height: 1.5; color: #64748b; margin-top: 20px;">
                If the button above does not work, copy and paste this link into your browser:<br>
                <a href="${safeUrl}" target="_blank" style="color: ${BRAND_COLORS.teal}; word-break: break-all; text-decoration: underline;">
                  ${safeUrl}
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 36px; text-align: center; font-size: 12px; line-height: 1.5; color: #94a3b8;">
              <p style="margin: 0 0 6px 0; font-weight: 600; color: #64748b;">
                ${escapeHtml(APP_NAME)} &bull; ${escapeHtml(APP_TAGLINE)}
              </p>
              <p style="margin: 0;">
                This automated message was sent to ${safeEmail}. If you did not expect this invitation, please contact your laboratory administrator.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Plain-text fallback for welcome emails.
 */
export function renderWelcomeEmailText(params: {
  name: string;
  email: string;
  temporaryPassword: string;
  role?: string;
  siteName?: string | null;
  changePasswordUrl: string;
}): string {
  return `Hello ${params.name},

Your account for the ${APP_NAME} (${APP_TAGLINE}) has been created.

ACCOUNT CREDENTIALS:
- Email: ${params.email}
${params.role ? `- Role: ${params.role}\n` : ""}${params.siteName ? `- Laboratory Site: ${params.siteName}\n` : ""}- Temporary Password: ${params.temporaryPassword}

CHANGE PASSWORD & SIGN IN:
Visit this link to sign in and set your personal password:
${params.changePasswordUrl}

SECURITY REQUIREMENT:
For laboratory compliance, this is a one-time temporary password. You are required to choose your own secure password upon your first sign in. Never share your credentials with anyone.

--
${APP_NAME} - ${APP_TAGLINE}
Automated message sent to ${params.email}.
`;
}

/**
 * Generates an HTML email for password resets.
 */
export function renderPasswordResetEmailHtml(params: {
  name: string;
  email: string;
  temporaryPassword: string;
  changePasswordUrl: string;
}): string {
  const safeName = escapeHtml(params.name);
  const safeEmail = escapeHtml(params.email);
  const safePassword = escapeHtml(params.temporaryPassword);
  const safeUrl = escapeHtml(params.changePasswordUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset &bull; ${escapeHtml(APP_NAME)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: ${BRAND_COLORS.navy}; background-image: linear-gradient(135deg, ${BRAND_COLORS.navy} 0%, ${BRAND_COLORS.teal} 100%); padding: 32px 36px;">
              <div style="font-size: 22px; font-weight: 800; color: #ffffff;">${escapeHtml(APP_NAME)}</div>
              <div style="font-size: 11px; font-weight: 700; color: #a5f3fc; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 3px;">
                ${escapeHtml(APP_TAGLINE)}
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: ${BRAND_COLORS.navy};">
                Password Reset for ${safeName}
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                An administrator has reset the password for your ${escapeHtml(APP_NAME)} account (${safeEmail}). All active sessions have been signed out.
              </p>

              <!-- Credentials Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #64748b; margin-bottom: 8px;">
                      New Temporary Password
                    </div>
                    <div style="background-color: #ffffff; border: 2px dashed #94a3b8; border-radius: 8px; padding: 14px 18px; text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 22px; font-weight: 800; letter-spacing: 3px; color: ${BRAND_COLORS.navy};">
                      ${safePassword}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Button -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <a href="${safeUrl}" target="_blank" style="display: inline-block; background-color: ${BRAND_COLORS.teal}; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 10px;">
                      Sign In &amp; Set New Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Direct link -->
              <div style="font-size: 12.5px; color: #64748b; margin-top: 16px;">
                Direct change password URL:<br>
                <a href="${safeUrl}" target="_blank" style="color: ${BRAND_COLORS.teal}; word-break: break-all;">${safeUrl}</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 36px; text-align: center; font-size: 12px; color: #94a3b8;">
              ${escapeHtml(APP_NAME)} &bull; Automated notification
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Plain text fallback for password resets.
 */
export function renderPasswordResetEmailText(params: {
  name: string;
  email: string;
  temporaryPassword: string;
  changePasswordUrl: string;
}): string {
  return `Hello ${params.name},

An administrator has reset the password for your ${APP_NAME} account (${params.email}).

New Temporary Password:
${params.temporaryPassword}

Sign in and choose your new password here:
${params.changePasswordUrl}

--
${APP_NAME}
`;
}

/**
 * Sends a welcome email to a newly created user via Resend onboarding / configured domain.
 */
export async function sendUserWelcomeEmail(params: WelcomeEmailParams): Promise<SendEmailResult> {
  const resend = getResendClient();
  const changePasswordUrl = buildChangePasswordUrl(params.to);

  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY is not configured. Skipped sending welcome email to ${params.to}.`,
    );
    return {
      ok: false,
      error: "RESEND_API_KEY is not configured or not saved in .env",
    };
  }

  const from = env.EMAIL_FROM || "BenchBook <onboarding@resend.dev>";
  const html = renderWelcomeEmailHtml({
    name: params.name,
    email: params.to,
    temporaryPassword: params.temporaryPassword,
    role: params.role,
    siteName: params.siteName,
    changePasswordUrl,
  });
  const text = renderWelcomeEmailText({
    name: params.name,
    email: params.to,
    temporaryPassword: params.temporaryPassword,
    role: params.role,
    siteName: params.siteName,
    changePasswordUrl,
  });

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: `Welcome to ${APP_NAME} — Your account credentials & sign-in link`,
      html,
      text,
    });

    if (error) {
      console.error(`[email] Resend API error sending to ${params.to}:`, error);
      return {
        ok: false,
        error: error.message || "Failed to send email via Resend",
      };
    }

    console.info(`[email] Welcome email sent to ${params.to} (id: ${data?.id})`);
    return {
      ok: true,
      id: data?.id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected email error";
    console.error(`[email] Exception sending to ${params.to}:`, err);
    return {
      ok: false,
      error: message,
    };
  }
}

/**
 * Sends a password reset email via Resend.
 */
export async function sendPasswordResetEmail(
  params: PasswordResetEmailParams,
): Promise<SendEmailResult> {
  const resend = getResendClient();
  const changePasswordUrl = buildChangePasswordUrl(params.to);

  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY is not configured. Skipped sending password reset email to ${params.to}.`,
    );
    return {
      ok: false,
      error: "RESEND_API_KEY is not configured or not saved in .env",
    };
  }

  const from = env.EMAIL_FROM || "BenchBook <onboarding@resend.dev>";
  const html = renderPasswordResetEmailHtml({
    name: params.name,
    email: params.to,
    temporaryPassword: params.temporaryPassword,
    changePasswordUrl,
  });
  const text = renderPasswordResetEmailText({
    name: params.name,
    email: params.to,
    temporaryPassword: params.temporaryPassword,
    changePasswordUrl,
  });

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: `[${APP_NAME}] Your temporary password has been reset`,
      html,
      text,
    });

    if (error) {
      console.error(`[email] Resend API error sending reset to ${params.to}:`, error);
      return {
        ok: false,
        error: error.message || "Failed to send reset email via Resend",
      };
    }

    console.info(`[email] Password reset email sent to ${params.to} (id: ${data?.id})`);
    return {
      ok: true,
      id: data?.id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected email error";
    console.error(`[email] Exception sending reset to ${params.to}:`, err);
    return {
      ok: false,
      error: message,
    };
  }
}
