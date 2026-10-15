import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@react-pdf/renderer"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Prevent browsers from MIME-sniffing the response body away from declared Content-Type
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Protect user privacy by sending full referrer only to same origin and origin-only cross-origin
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Prevent clickjacking by disallowing the site from being framed
          { key: "X-Frame-Options", value: "DENY" },
          // Restrict browser permissions for sensitive features not used by the lab reservation app
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
