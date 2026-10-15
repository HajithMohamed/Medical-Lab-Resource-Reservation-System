import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { APP_NAME, APP_TAGLINE, BRAND_COLORS } from "@/config/brand";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_TAGLINE,
  applicationName: APP_NAME,
};

export const viewport: Viewport = {
  themeColor: BRAND_COLORS.teal,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased font-sans" style={{ colorScheme: "light" }}>
      <body className="min-h-full flex flex-col selection:bg-teal-soft selection:text-teal-deep">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster theme="light" position="bottom-right" richColors />
      </body>
    </html>
  );
}
