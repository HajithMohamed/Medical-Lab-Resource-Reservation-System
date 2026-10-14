import type { Metadata, Viewport } from "next";
import "@fontsource-variable/atkinson-hyperlegible-next";
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
  themeColor: BRAND_COLORS.navy,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased font-sans dark">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
